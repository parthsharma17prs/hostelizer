"""
Hostelizer AI / ML Microservice
Provides:
1. Natural Language Search Parser (translates user prompt into structured search query)
2. Hybrid PG Recommendation Engine (budget, commute distance, gender, amenities, food)
3. Rental Price Predictor (estimates baseline rent for property/room setup)
4. AI Accommodation Assistant Q&A
"""

import math
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Hostelizer AI Service",
    description="Natural Language Search, Recommendations & Property Intelligence for Hostelizer",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Data Contracts -----------------

class NLSearchRequest(BaseModel):
    query: str = Field(..., example="Find boys PG near Vijay Nagar Indore below 8000 with food and AC")

class ParsedFilters(BaseModel):
    city: Optional[str] = None
    locality: Optional[str] = None
    max_budget: Optional[float] = None
    gender_preference: Optional[str] = None # BOYS, GIRLS, COED
    sharing: Optional[int] = None # 1, 2, 3, 4
    has_ac: Optional[bool] = None
    food_included: Optional[bool] = None
    amenities: List[str] = []
    college_or_landmark: Optional[str] = None

class PropertyFeature(BaseModel):
    id: str
    name: str
    city: str
    locality: str
    monthly_rent: float
    gender_preference: str # BOYS, GIRLS, COED
    food_included: bool
    has_ac: bool
    sharing_type: int # 1, 2, 3
    distance_km: float = 1.0 # distance from target college/landmark
    amenities: List[str] = []
    average_rating: float = 4.0

class RecommendationRequest(BaseModel):
    budget: float
    gender: str
    preferred_locality: Optional[str] = None
    target_distance_max_km: float = 5.0
    require_food: bool = False
    require_ac: bool = False
    preferred_sharing: Optional[int] = None
    properties: List[PropertyFeature]

class RecommendedProperty(BaseModel):
    id: str
    name: str
    match_score: float # 0 to 100%
    reasons: List[str]

class RentPredictionRequest(BaseModel):
    city: str
    locality: str
    sharing: int
    has_ac: bool
    food_included: bool
    amenity_count: int = 4

class RentPredictionResponse(BaseModel):
    predicted_rent: float
    min_range: float
    max_range: float
    confidence_score: float

# ----------------- Endpoints -----------------

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "hostelizer-ai"}

@app.post("/api/ai/parse-query", response_model=ParsedFilters)
def parse_natural_language_search(request: NLSearchRequest):
    """
    Parses unstructured user input into structured query parameters.
    Supports city/locality detection, budget keywords ('below 8000', 'under 10k'),
    amenities (food, ac, wifi, gym), and gender preferences.
    """
    text = request.query.lower()
    filters = ParsedFilters()

    # Gender parsing
    if any(k in text for k in ["boys", "boy", "male", "men", "gents"]):
        filters.gender_preference = "BOYS"
    elif any(k in text for k in ["girls", "girl", "female", "women", "ladies"]):
        filters.gender_preference = "GIRLS"
    elif any(k in text for k in ["coed", "unisex", "both"]):
        filters.gender_preference = "COED"

    # AC parsing
    if "non-ac" in text or "without ac" in text:
        filters.has_ac = False
    elif "ac" in text or "air conditioner" in text or "air conditioned" in text:
        filters.has_ac = True

    # Food parsing
    if "with food" in text or "mess" in text or "food included" in text or "meals" in text:
        filters.food_included = True

    # Sharing parsing
    if "single" in text or "1 sharing" in text or "private room" in text:
        filters.sharing = 1
    elif "double" in text or "2 sharing" in text:
        filters.sharing = 2
    elif "triple" in text or "3 sharing" in text:
        filters.sharing = 3
    elif "four sharing" in text or "4 sharing" in text:
        filters.sharing = 4

    # Budget parsing
    import re
    # matches 'below 8000', 'under 10000', 'under 8k', '< 7500'
    budget_match = re.search(r'(?:under|below|max|budget of|<|within)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(k|thousand)?', text)
    if budget_match:
        val = float(budget_match.group(1))
        if budget_match.group(2) in ['k', 'thousand']:
            val *= 1000
        filters.max_budget = val
    else:
        # direct pattern e.g. "8000" or "8k"
        direct_k = re.search(r'(\d+)\s*k\b', text)
        if direct_k:
            filters.max_budget = float(direct_k.group(1)) * 1000

    # Common Indian cities detection
    cities = ["indore", "bangalore", "bengaluru", "pune", "delhi", "noida", "gurgaon", "gurugram", "mumbai", "hyderabad", "chennai", "kota", "jaipur"]
    for city in cities:
        if city in text:
            filters.city = city.capitalize()
            break

    # Localities detection
    localities = ["vijay nagar", "palasia", "bhawarkua", "koramangala", "h布置", "indiranagar", "whitefield", "hinjewadi", "wakad", "kothrud", "south campus", "north campus", "kaluwada"]
    for loc in localities:
        if loc in text:
            filters.locality = loc.title()
            break

    # Amenities extraction
    amenities_pool = {
        "wifi": "Wi-Fi",
        "wi-fi": "Wi-Fi",
        "laundry": "Laundry",
        "washing machine": "Washing Machine",
        "gym": "Gym",
        "cctv": "CCTV",
        "power backup": "Power Backup",
        "cleaning": "Housekeeping",
        "housekeeping": "Housekeeping",
        "parking": "Parking"
    }
    for key, val in amenities_pool.items():
        if key in text and val not in filters.amenities:
            filters.amenities.append(val)

    return filters

@app.post("/api/ai/recommend", response_model=List[RecommendedProperty])
def rank_recommendations(req: RecommendationRequest):
    """
    Multi-objective scoring engine:
    1. Budget compatibility (40 pts)
    2. Gender eligibility (Hard match or 0)
    3. Distance to target landmark/college (25 pts)
    4. Essential amenities: Food, AC, Sharing (25 pts)
    5. Reviews & Quality score (10 pts)
    """
    scored: List[RecommendedProperty] = []

    for p in req.properties:
        score = 0.0
        reasons: List[str] = []

        # 1. Gender check
        if req.gender and p.gender_preference not in [req.gender, "COED"]:
            continue # Incompatible

        # 2. Budget score (higher score if under or right on budget)
        if p.monthly_rent <= req.budget:
            savings = req.budget - p.monthly_rent
            savings_ratio = min(savings / req.budget, 0.3)
            budget_score = 35.0 + (savings_ratio * 15.0)
            score += min(budget_score, 40.0)
            reasons.append(f"Fits your ₹{int(req.budget):,} monthly budget comfortably")
        elif p.monthly_rent <= req.budget * 1.15:
            score += 20.0
            reasons.append("Slightly above budget but high value")
        else:
            score += 5.0

        # 3. Commute distance score
        if p.distance_km <= 1.5:
            score += 25.0
            reasons.append(f"Very close to your destination ({p.distance_km} km away)")
        elif p.distance_km <= req.target_distance_max_km:
            dist_factor = 1.0 - (p.distance_km / req.target_distance_max_km)
            score += 15.0 + (dist_factor * 10.0)
            reasons.append(f"Within comfortable commute range ({p.distance_km} km)")
        else:
            score += 5.0

        # 4. Amenities & Food
        if req.require_food:
            if p.food_included:
                score += 15.0
                reasons.append("Hygienic meals included")
            else:
                score -= 10.0
        else:
            if p.food_included:
                score += 5.0

        if req.require_ac and p.has_ac:
            score += 10.0
            reasons.append("Equipped with AC")

        if req.preferred_sharing and p.sharing_type == req.preferred_sharing:
            score += 5.0
            reasons.append(f"Offers your desired {p.sharing_type}-sharing room")

        # 5. Rating bonus
        rating_bonus = (p.average_rating / 5.0) * 10.0
        score += rating_bonus
        if p.average_rating >= 4.5:
            reasons.append(f"Highly rated by residents ({p.average_rating}★)")

        final_score = min(max(round(score, 1), 20.0), 99.0)
        scored.append(RecommendedProperty(
            id=p.id,
            name=p.name,
            match_score=final_score,
            reasons=reasons[:3]
        ))

    # Sort descending by match score
    scored.sort(key=lambda x: x.match_score, reverse=True)
    return scored

@app.post("/api/ai/predict-rent", response_model=RentPredictionResponse)
def predict_rental_price(req: RentPredictionRequest):
    """
    Estimates fair market rent based on city tier, sharing capacity, AC and amenities.
    Empirical baseline model calibrated for Indian student and working professional PGs.
    """
    # Tier 1 base: Bangalore, Mumbai, Delhi/Gurgaon; Tier 2: Indore, Pune, Kota, Jaipur
    t1_cities = ["bangalore", "bengaluru", "mumbai", "delhi", "gurgaon", "gurugram", "hyderabad"]
    city_lower = req.city.lower()
    base_rent = 9000.0 if any(c in city_lower for c in t1_cities) else 6500.0

    # Sharing multiplier
    sharing_multiplier = {
        1: 1.65, # Single private room
        2: 1.0,  # Double sharing (base)
        3: 0.78, # Triple sharing
        4: 0.65  # Four sharing
    }.get(req.sharing, 1.0)

    calculated = base_rent * sharing_multiplier

    # AC surcharge
    if req.has_ac:
        calculated += 1800.0

    # Food surcharge
    if req.food_included:
        calculated += 2200.0

    # Amenity density
    calculated += (req.amenity_count * 200.0)

    final_pred = round(calculated / 100.0) * 100.0 # Round to nearest 100
    return RentPredictionResponse(
        predicted_rent=final_pred,
        min_range=round(final_pred * 0.9 / 100.0) * 100.0,
        max_range=round(final_pred * 1.15 / 100.0) * 100.0,
        confidence_score=0.88
    )

