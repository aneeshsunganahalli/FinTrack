import httpx
from datetime import datetime, timedelta
from backend.models import SessionLocal, Settings

class TwelveDataService:
    BASE_URL = "https://api.twelvedata.com"
    _price_cache = {}
    _search_cache = {}
    
    @classmethod
    def get_api_key(cls):
        db = SessionLocal()
        try:
            setting = db.query(Settings).filter_by(key="twelvedata_api_key").first()
            if setting and setting.value:
                return setting.value
        finally:
            db.close()
        return None

    @classmethod
    def search_symbols(cls, query: str):
        if not query:
            return []
            
        if query in cls._search_cache:
            return cls._search_cache[query]
            
        # We don't strictly need the API key for symbol search in TwelveData, but we pass it if we have it
        params = {"symbol": query}
        api_key = cls.get_api_key()
        
        try:
            with httpx.Client() as client:
                res = client.get(f"{cls.BASE_URL}/symbol_search", params=params, timeout=5)
                res.raise_for_status()
                data = res.json()
                if "data" in data:
                    cls._search_cache[query] = data["data"]
                    return data["data"]
                return []
        except Exception as e:
            print(f"Error searching TwelveData: {e}")
            return []

    @classmethod
    def get_live_prices(cls, symbols: list):
        if not symbols:
            return {}
            
        api_key = cls.get_api_key()
        if not api_key:
            return {}
            
        symbols_to_fetch = []
        now = datetime.now()
        
        # Check cache (1 hour TTL)
        result = {}
        for sym in symbols:
            if sym in cls._price_cache and now - cls._price_cache[sym]["time"] < timedelta(hours=1):
                result[sym] = cls._price_cache[sym]["price"]
            else:
                symbols_to_fetch.append(sym)
                
        if not symbols_to_fetch:
            return result
            
        try:
            symbol_str = ",".join(symbols_to_fetch)
            params = {
                "symbol": symbol_str,
                "apikey": api_key
            }
            with httpx.Client() as client:
                res = client.get(f"{cls.BASE_URL}/price", params=params, timeout=10)
                res.raise_for_status()
                data = res.json()
                
                # TwelveData format:
                # single symbol: {"price": "150.00"}
                # multiple symbols: {"AAPL": {"price": "150.00"}, "MSFT": {"price": "250.00"}}
                if len(symbols_to_fetch) == 1:
                    sym = symbols_to_fetch[0]
                    if "price" in data:
                        price = float(data["price"])
                        result[sym] = price
                        cls._price_cache[sym] = {"price": price, "time": now}
                else:
                    for sym in symbols_to_fetch:
                        if sym in data and "price" in data[sym]:
                            price = float(data[sym]["price"])
                            result[sym] = price
                            cls._price_cache[sym] = {"price": price, "time": now}
                            
        except Exception as e:
            print(f"Error fetching live prices from TwelveData: {e}")
            
        return result
