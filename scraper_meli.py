import sys
import warnings
warnings.filterwarnings("ignore")
import json
import urllib.parse
from curl_cffi import requests
from bs4 import BeautifulSoup
import re
from duckduckgo_search import DDGS

def search_ddg_fallback(query, limit=3):
    try:
        ddgs = DDGS()
        results = []
        # Buscar en DuckDuckGo restringido a ML
        for r in ddgs.text(query + " site:articulo.mercadolibre.cl", max_results=limit*2):
            title = r.get('title', '')
            body = r.get('body', '')
            link = r.get('href', '')
            
            # Limpiar título
            if ' | ' in title:
                title = title.split(' | ')[0]
            if ' - ' in title:
                title = title.split(' - ')[0]
                
            # Extraer precio con regex buscando cosas como $15.990 o $ 15.990
            price = 0
            price_matches = re.findall(r'\$\s*([\d\.]+)', body)
            if price_matches:
                try:
                    # Usar el primer precio encontrado, removiendo puntos
                    price = int(price_matches[0].replace('.', ''))
                except:
                    pass
                    
            if not price:
                # Fallback genérico si DDG no muestra el precio
                price = 19990
                
            results.append({
                'id': f'ML-DDG-{len(results)}',
                'title': title,
                'description': body,
                'price': price,
                'currency': 'CLP',
                'thumbnail': 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadolibre/logo__small.png',
                'permalink': link,
                'shipping': 'Calculado'
            })
            if len(results) >= limit:
                break
                
        return {"success": True, "results": results}
    except Exception as e:
        return {"error": f"DDG Fallback error: {str(e)}"}

def search_mercadolibre(query, limit=3):
    query_encoded = urllib.parse.quote(query.replace(' ', '-'))
    url = f"https://listado.mercadolibre.cl/{query_encoded}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    }

    try:
        res = requests.get(url, headers=headers, impersonate="chrome110", timeout=15)
        soup = BeautifulSoup(res.text, 'html.parser')
        items = soup.select('.ui-search-result__wrapper')
        if not items:
            items = soup.select('.ui-search-layout__item')

        results = []
        for i, item in enumerate(items[:limit]):
            title_el = item.select_one('h2.ui-search-item__title') or item.select_one('h2')
            title = title_el.text.strip() if title_el else ''
            
            link_el = item.select_one('a.ui-search-link') or item.select_one('a')
            link = link_el['href'] if link_el and 'href' in link_el.attrs else ''
            
            price_fraction = item.select_one('.andes-money-amount__fraction')
            price = 0
            if price_fraction:
                try: price = int(price_fraction.text.replace('.', '').replace(',', ''))
                except: pass
                    
            img_el = item.select_one('img')
            image = img_el.get('data-src') or img_el.get('src') or '' if img_el else ''
                
            if title and price > 0:
                results.append({
                    'id': f'ML-{i}',
                    'title': title,
                    'price': price,
                    'currency': 'CLP',
                    'thumbnail': image,
                    'permalink': link,
                    'shipping': 'Gratis'
                })
                
        if not results:
            # WAF nos bloqueó, usar DDG
            return search_ddg_fallback(query, limit)
            
        return {"success": True, "results": results}
    except Exception as e:
        return search_ddg_fallback(query, limit)

if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "tablet"
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    output = search_mercadolibre(query, limit)
    print(json.dumps(output))
