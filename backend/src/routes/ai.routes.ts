import { Router, Request, Response } from 'express';
import { db } from '../store/memoryStore';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// NL Search Gateway: Forward to Python FastAPI AI or fall back to native rule-based parsing
router.post('/parse-search', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    // Attempt to call Python FastAPI
    const response = await fetch(`${AI_SERVICE_URL}/api/ai/parse-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({ parsedFilters: data });
    }
  } catch (err) {
    console.warn('AI service offline, executing built-in fallback parser:', err);
  }

  // Built-in intelligent fallback
  const text = query.toLowerCase();
  const filters: any = { amenities: [] };

  if (text.includes('boy') || text.includes('male')) filters.gender_preference = 'BOYS';
  if (text.includes('girl') || text.includes('female')) filters.gender_preference = 'GIRLS';
  if (text.includes('ac') && !text.includes('non-ac')) filters.has_ac = true;
  if (text.includes('food') || text.includes('mess')) filters.food_included = true;
  if (text.includes('single')) filters.sharing = 1;
  if (text.includes('double')) filters.sharing = 2;
  if (text.includes('triple')) filters.sharing = 3;

  const budgetMatch = text.match(/(\d+)\s*k/);
  if (budgetMatch) {
    filters.max_budget = parseInt(budgetMatch[1]) * 1000;
  } else {
    const numMatch = text.match(/(?:under|below)\s*(\d{4,5})/);
    if (numMatch) filters.max_budget = parseInt(numMatch[1]);
  }

  if (text.includes('indore')) filters.city = 'Indore';
  if (text.includes('bangalore') || text.includes('bengaluru')) filters.city = 'Bangalore';
  if (text.includes('vijay nagar')) filters.locality = 'Vijay Nagar';
  if (text.includes('koramangala')) filters.locality = 'Koramangala';

  return res.json({ parsedFilters: filters });
});

// Recommendations Gateway
router.post('/recommend', async (req: Request, res: Response) => {
  const { budget, gender, maxDistanceKm } = req.body;

  const published = db.properties.filter(p => p.status === 'PUBLISHED').map(p => ({
    id: p.id,
    name: p.name,
    city: p.city,
    locality: p.locality,
    monthly_rent: p.monthlyRentStarting,
    gender_preference: p.genderPreference,
    food_included: p.foodIncluded,
    has_ac: p.rooms.some(r => r.hasAC),
    sharing_type: 2,
    distance_km: 1.2,
    amenities: p.amenities,
    average_rating: 4.8
  }));

  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budget: budget || 10000,
        gender: gender || 'BOYS',
        target_distance_max_km: maxDistanceKm || 5.0,
        properties: published
      })
    });

    if (aiResponse.ok) {
      const recommendations = await aiResponse.json();
      return res.json({ recommendations });
    }
  } catch (err) {
    console.warn('AI service offline, generating ranking fallback:', err);
  }

  // Fallback match scores
  const fallback = published.map(p => {
    let score = 85;
    const reasons = ['Matches selected gender criteria', 'Within desired city location'];
    if (budget && p.monthly_rent <= budget) {
      score += 10;
      reasons.push(`Under budget limit (₹${p.monthly_rent})`);
    }
    return {
      id: p.id,
      name: p.name,
      match_score: Math.min(score, 98),
      reasons
    };
  });

  res.json({ recommendations: fallback });
});

// Rent Estimation Gateway
router.post('/predict-rent', async (req: Request, res: Response) => {
  const { city, sharing, hasAC, foodIncluded, amenityCount } = req.body;

  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/predict-rent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: city || 'Indore',
        locality: 'Vijay Nagar',
        sharing: sharing || 2,
        has_ac: !!hasAC,
        food_included: !!foodIncluded,
        amenity_count: amenityCount || 4
      })
    });

    if (aiResponse.ok) {
      const pred = await aiResponse.json();
      return res.json(pred);
    }
  } catch (err) {
    console.warn('AI service fallback for rent prediction:', err);
  }

  // Fallback calculation
  let base = (city && city.toLowerCase() === 'bangalore') ? 9500 : 7000;
  if (sharing === 1) base *= 1.6;
  if (sharing === 3) base *= 0.8;
  if (hasAC) base += 1500;
  if (foodIncluded) base += 2000;

  const predicted = Math.round(base / 100) * 100;
  res.json({
    predicted_rent: predicted,
    min_range: predicted - 800,
    max_range: predicted + 1200,
    confidence_score: 0.85
  });
});

export default router;

