"""
Zillow URL parser and best-effort property data extractor.

URL slug parsing (address / city / state / zip) is reliable — Zillow encodes
these directly in the path.  Page scraping is best-effort: Render's datacenter
IPs are frequently blocked by Zillow's bot detection, so we fall back silently
to whatever the URL slug alone provides.
"""

import re
import json
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

try:
    from bs4 import BeautifulSoup
    _BS4 = True
except ImportError:
    _BS4 = False

router = APIRouter(prefix="/api/zillow", tags=["zillow"])

US_STATES = {
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
    'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
    'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
    'TX','UT','VT','VA','WA','WV','WI','WY','DC',
}

ZILLOW_TYPE_MAP = {
    'SINGLE_FAMILY':      'single_family',
    'SingleFamilyResidence': 'single_family',
    'TOWNHOUSE':          'single_family',
    'CONDO':              'other',
    'APARTMENT':          'other',
    'MULTI_FAMILY':       'small_multifamily',
    'MultiFamily2Units':  'duplex',
    'DUPLEX':             'duplex',
    'MultiFamily3To4Units': 'fourplex',
    'TRIPLEX':            'fourplex',
    'QUADRUPLEX':         'fourplex',
    'MultiFamily5PlusUnits': 'small_multifamily',
}


class ZillowRequest(BaseModel):
    url: str


# ── URL slug parsing ──────────────────────────────────────────────────────────

def _parse_slug(url: str) -> dict:
    """
    Extract address fields from the Zillow URL slug.
    Example: /homedetails/1919-Morehead-Ave-Durham-NC-27705/12345_zpid/
    """
    m = re.search(r'/homedetails/([^/?#]+)', url)
    if not m:
        return {}

    slug = re.sub(r'-\d+_zpid$', '', m.group(1))
    parts = slug.split('-')

    # Find the 2-letter state code
    state_idx = next(
        (i for i, p in enumerate(parts) if p.upper() in US_STATES),
        None,
    )
    if state_idx is None:
        return {}

    state    = parts[state_idx].upper()
    zip_code = (parts[state_idx + 1]
                if state_idx + 1 < len(parts)
                and re.match(r'^\d{5}$', parts[state_idx + 1])
                else None)
    city     = parts[state_idx - 1].title() if state_idx > 0 else None
    address  = ' '.join(p.title() for p in parts[:max(state_idx - 1, 0)]) or None

    return {k: v for k, v in {
        'address': address, 'city': city, 'state': state, 'zip_code': zip_code,
    }.items() if v}


# ── Page scraping (best-effort) ───────────────────────────────────────────────

_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}


def _parse_jsonld(node: dict) -> dict:
    out = {}
    dtype = node.get('@type', '')
    addr = node.get('address') or {}
    if isinstance(addr, dict):
        if addr.get('streetAddress'):   out['address']  = addr['streetAddress']
        if addr.get('addressLocality'): out['city']     = addr['addressLocality']
        if addr.get('addressRegion'):   out['state']    = addr['addressRegion']
        if addr.get('postalCode'):      out['zip_code'] = addr['postalCode']
    beds  = node.get('numberOfBedrooms')
    baths = node.get('numberOfBathroomsTotal') or node.get('numberOfBathroomsFull')
    if beds  is not None: out['beds']  = int(float(beds))
    if baths is not None: out['baths'] = float(baths)
    fs = node.get('floorSize') or {}
    if isinstance(fs, dict) and fs.get('value'):
        out['sqft'] = int(float(fs['value']))
    offers = node.get('offers') or {}
    if isinstance(offers, dict) and offers.get('price'):
        out['asking_price'] = float(offers['price'])
    if dtype and dtype in ZILLOW_TYPE_MAP:
        out['property_type'] = ZILLOW_TYPE_MAP[dtype]
    return out


def _parse_next_data(nd: dict) -> dict:
    out = {}
    try:
        props = nd.get('props', {}).get('pageProps', {})
        # gdpClientCache path (common in Zillow's Next.js build)
        cache = props.get('gdpClientCache') or {}
        for v in cache.values():
            if not isinstance(v, dict):
                continue
            prop = v.get('property') or {}
            if not prop:
                continue
            if prop.get('price'):        out['asking_price']  = float(prop['price'])
            if prop.get('bedrooms'):     out['beds']          = int(prop['bedrooms'])
            if prop.get('bathrooms'):    out['baths']         = float(prop['bathrooms'])
            if prop.get('livingArea'):   out['sqft']          = int(prop['livingArea'])
            if prop.get('unitCount'):    out['num_units']     = int(prop['unitCount'])
            ht = prop.get('homeType', '')
            if ht in ZILLOW_TYPE_MAP:    out['property_type'] = ZILLOW_TYPE_MAP[ht]
            addr = prop.get('address') or {}
            if addr.get('streetAddress'): out['address']      = addr['streetAddress']
            if addr.get('city'):          out['city']         = addr['city']
            if addr.get('state'):         out['state']        = addr['state']
            if addr.get('zipcode'):       out['zip_code']     = addr['zipcode']
            if addr.get('neighborhood'):  out['neighborhood'] = addr['neighborhood']
            break
    except Exception:
        pass
    return out


async def _fetch_page(url: str) -> dict:
    if not _BS4:
        return {}
    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
        r = await client.get(url, headers=_HEADERS)
    if r.status_code != 200:
        return {}

    soup = BeautifulSoup(r.text, 'html.parser')
    out  = {}

    # JSON-LD structured data
    for tag in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(tag.string or '')
            nodes = data if isinstance(data, list) else [data]
            for node in nodes:
                out.update(_parse_jsonld(node))
        except Exception:
            pass

    # __NEXT_DATA__ (Zillow's Next.js data blob)
    script = soup.find('script', id='__NEXT_DATA__')
    if script:
        try:
            out.update(_parse_next_data(json.loads(script.string or '')))
        except Exception:
            pass

    return {k: v for k, v in out.items() if v is not None}


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post('/extract')
async def zillow_extract(payload: ZillowRequest):
    result = {}

    # Step 1: URL slug (always works)
    result.update(_parse_slug(payload.url))

    # Step 2: page scrape (blocked by Zillow on cloud IPs most of the time)
    try:
        page = await _fetch_page(payload.url)
        result.update(page)
    except Exception:
        pass

    # Indicate whether page data was retrieved so the UI can tailor its message
    result['page_scraped'] = bool(result.get('asking_price') or result.get('beds'))
    return result
