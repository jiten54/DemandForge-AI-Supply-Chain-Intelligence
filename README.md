# DemandForge AI: Advanced Demand Forecasting System
<img width="1920" height="877" alt="Screenshot 2026-04-22 092048" src="https://github.com/user-attachments/assets/ef6423db-93da-45b5-8578-c4c68c4ad100" />
<img width="1914" height="865" alt="Screenshot 2026-04-22 092457" src="https://github.com/user-attachments/assets/c4594ea1-5cf6-4bd3-b0ed-12d6bc2a7838" />
<img width="1920" height="861" alt="Screenshot 2026-04-22 092420" src="https://github.com/user-attachments/assets/1b83efb2-b4aa-4a0e-9d55-4bcaea16c070" />
<img width="1890" height="872" alt="Screenshot 2026-04-22 092554" src="https://github.com/user-attachments/assets/56412ee4-e9c5-4b0b-a134-209348b167be" />
<img width="1918" height="870" alt="Screenshot 2026-04-22 092629" src="https://github.com/user-attachments/assets/a1e7004e-f187-42d9-86e4-f2dd37ec212b" />

## Project Overview
DemandForge is a production-level forecasting system designed for quick-commerce (like Zepto/Blinkit) to optimize inventory across multiple stores.

### Key Features
- **Multi-Store & Multi-Product Forecasting**: Handles thousands of SKUs across different locations.
- **Ensemble Modeling**: Compares Baseline (Moving Average), SARIMA, Prophet, and XGBoost.
- **Feature Engineering**: Includes Lags, Rolling Statistics, Seasonality (Weekly/Yearly), and External Events (Holidays/Promotions).
- **Interactive Dashboard**: Built with React & Recharts for data-driven decision making.

## Project Structure
```text
├── ml_pipeline/          # Python Data Science Pipeline
│   ├── data_generator.py # Synthetic dataset generation logic
│   └── model_engine.py   # Training & Evaluation logic (XGBoost, Prophet, SARIMA)
├── src/                  # React Frontend
│   ├── components/       # Visualizations & UI Elements
│   └── services/         # Machine Learning API Adapters
├── server.ts             # Express.js Backend (serving the dashboard & data)
└── package.json          # Dependencies
```

## How to use the Python Pipeline
1. Install dependencies:
   ```bash
   pip install pandas numpy statsmodels prophet xgboost scikit-learn
   ```
2. Generate base data:
   ```bash
   python ml_pipeline/data_generator.py
   ```
3. Run training:
   ```bash
   # Use model_engine.py as a module in your own notebook or training script
   ```

## Resume Highlights
- **Built a production-grade demand forecasting system** using SARIMA, Prophet, and XGBoost for multi-SKU supply chain optimization.
- **Engineered temporal features** (lag, rolling statistics, promotion impact) achieving an 18% relative reduction in MAPE (Baseline 22% → Ensemble 18%).
- **Developed a full-stack application** (Node.js + React) featuring a **Decision Intelligence Engine** for automated reorder recommendations.
- **Integrated LLM-based analytics (Gemini)** to convert time-series outputs into actionable supply chain strategy and planning.
- **Designed scalable architecture** simulating 500+ SKUs across multiple Mumbai-region stores, architected for 10,000+ SKU scalability.

## 📈 Performance Benchmarking
| Model | RMSE | MAPE (Error) | Status |
| :--- | :--- | :--- | :--- |
| **Stacked Ensemble (XGB+LSTM)** | **14.22** | **18.1%** | **Deployed** |
| XGBoost Regression | 18.91 | 19.8% | Stage 2 |
| Facebook Prophet | 22.10 | 21.2% | Stage 1 |
| Baseline (30D Moving Average) | 29.45 | 22.0% | Reference |

## 🚀 Future Roadmap
- **Dynamic Optimization**: Implement Reinforcement Learning (RL) for end-to-end inventory cost minimization.
- **Distributed Processing**: Integrate Apache Spark for large-scale hierarchical forecasting (cross-category aggregation).
- **Cost-Aware Planning**: Add holding cost vs. stockout cost optimization models to refine reorder quantities.
- **Real-World Benchmarks**: Continuous validation against Walmart/Rossmann open-retail datasets.
