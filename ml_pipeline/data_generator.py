import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_supply_chain_data(num_stores=5, num_products=10, start_date='2024-01-01', periods=365):
    """
    Generates a synthetic supply chain dataset for demand forecasting.
    Includes seasonality, trends, holidays, and promotions.
    """
    date_range = pd.date_range(start=start_date, periods=periods, freq='D')
    data = []
    
    stores = [f'ST_{str(i).zfill(3)}' for i in range(1, num_stores + 1)]
    categories = ['Produce', 'Dairy', 'Bakery', 'Beverages', 'Frozen']
    products = [f'PRD_{str(i).zfill(3)}' for i in range(1, num_products + 1)]
    
    # Assign categories to products
    product_meta = {p: np.random.choice(categories) for p in products}
    
    for store in stores:
        for product in products:
            # Base demand
            base_demand = np.random.randint(50, 200)
            
            # Weekly seasonality (higher on weekends)
            weekly_pattern = {0: 0.9, 1: 0.9, 2: 1.0, 3: 1.0, 4: 1.2, 5: 1.5, 6: 1.4}
            
            # Trend
            trend = np.linspace(0, 50, periods)
            
            for i, date in enumerate(date_range):
                # Seasonality
                seasonal_factor = weekly_pattern[date.weekday()]
                
                # Monthly seasonality (peak in summer/december)
                month_factor = 1.0 + 0.2 * np.sin(2 * np.pi * date.month / 12)
                
                # Promotion (10% chance)
                is_promo = 1 if np.random.random() < 0.1 else 0
                promo_boost = 1.5 if is_promo else 1.0
                
                # Random noise
                noise = np.random.normal(0, 10)
                
                sales = (base_demand + trend[i]) * seasonal_factor * month_factor * promo_boost + noise
                sales = max(0, int(sales))
                
                data.append({
                    'date': date,
                    'store_id': store,
                    'product_id': product,
                    'category': product_meta[product],
                    'sales': sales,
                    'is_promotion': is_promo,
                    'is_holiday': 1 if date.month == 12 and date.day == 25 else 0
                })
                
    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    df = generate_supply_chain_data()
    df.to_csv('demand_data.csv', index=False)
    print(f"Generated {len(df)} rows of data.")
