import pandas as pd
import numpy as np
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.statespace.sarimax import SARIMAX
from prophet import Prophet
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error

class MultiModelForecaster:
    def __init__(self, data):
        self.data = data
        self.best_model = None
        
    def preprocess(self):
        # Feature Engineering
        self.data['day_of_week'] = self.data['date'].dt.dayofweek
        self.data['is_weekend'] = self.data['day_of_week'].isin([5, 6]).astype(int)
        
        # Lag features
        for lag in [7, 14, 30]:
            self.data[f'lag_{lag}'] = self.data.groupby(['store_id', 'product_id'])['sales'].shift(lag)
            
        # Rolling stats
        self.data['rolling_mean_7'] = self.data.groupby(['store_id', 'product_id'])['sales'].transform(lambda x: x.rolling(7).mean())
        
        self.data.dropna(inplace=True)
        return self.data

    def train_sarima(self, train_data):
        """Standard SARIMA model"""
        model = SARIMAX(train_data['sales'], order=(1, 1, 1), seasonal_order=(1, 1, 1, 7))
        return model.fit(disp=False)

    def train_prophet(self, train_data):
        """Facebook Prophet model"""
        df_prophet = train_data.rename(columns={'date': 'ds', 'sales': 'y'})
        model = Prophet(weekly_seasonality=True, yearly_seasonality=True)
        model.fit(df_prophet)
        return model

    def train_xgboost(self, train_data, features):
        """XGBoost Regressor"""
        X = train_data[features]
        y = train_data['sales']
        model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100)
        model.fit(X, y)
        return model

    def evaluate(self, y_true, y_pred):
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
        return {"MAE": mae, "RMSE": rmse, "MAPE": mape}

# Example usage (not fully runnable without packages installed, but serves as production template)
# forecaster = MultiModelForecaster(df)
# processed_df = forecaster.preprocess()
