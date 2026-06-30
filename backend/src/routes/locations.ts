import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Country } from '../models/Location';
import { City } from '../models/Location';

const router = Router();

// Get repositories with proper initialization check
const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized');
  }
  return {
    countryRepository: AppDataSource.getRepository(Country),
    cityRepository: AppDataSource.getRepository(City)
  };
};

// GET /locations/countries - Return ALL countries, no LIMIT
router.get('/countries', async (req: Request, res: Response) => {
  try {
    const { countryRepository } = getRepositories();
    
    console.log('[LOCATIONS] GET /countries - Fetching all countries');
    
    const countries = await countryRepository.find({
      order: { name: 'ASC' }
    });

    console.log(`[LOCATIONS] ✓ Found ${countries.length} countries from database`);
    
    return res.json(countries);
  } catch (error: any) {
    console.error('[LOCATIONS ERROR] GET /countries failed:', error?.message);
    return res.status(500).json({ 
      message: 'Failed to fetch countries',
      error: error?.message 
    });
  }
});

// GET /locations/countries/:countryId/cities - Return ALL cities for country, no LIMIT
router.get('/countries/:countryId/cities', async (req: Request, res: Response) => {
  try {
    const { countryId } = req.params;
    const { countryRepository, cityRepository } = getRepositories();

    if (!countryId || countryId.length === 0) {
      console.warn('[LOCATIONS] Missing countryId parameter');
      return res.status(400).json({ message: 'countryId is required' });
    }

    console.log(`[LOCATIONS] GET /countries/${countryId}/cities - Fetching cities`);

    // Verify country exists
    const country = await countryRepository.findOne({ where: { id: countryId } });
    if (!country) {
      console.warn(`[LOCATIONS] Country not found: ${countryId}`);
      return res.status(404).json({ message: 'Country not found' });
    }

    // Fetch ALL cities for this country (no LIMIT)
    const cities = await cityRepository.find({
      where: { countryId: countryId },
      order: { name: 'ASC' }
    });

    console.log(`[LOCATIONS] ✓ Found ${cities.length} cities for ${country.name}`);

    return res.json(cities);
  } catch (error: any) {
    console.error('[LOCATIONS ERROR] GET /countries/:countryId/cities failed:', error?.message);
    return res.status(500).json({ 
      message: 'Failed to fetch cities',
      error: error?.message 
    });
  }
});

// GET /locations/countries/search/:query - Search countries by name or code
router.get('/countries/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const { countryRepository } = getRepositories();

    if (!query || query.length < 1) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    console.log(`[LOCATIONS] Searching for country: "${query}"`);

    const countries = await countryRepository
      .createQueryBuilder('country')
      .where('LOWER(country.name) LIKE LOWER(:name)', { name: `%${query}%` })
      .orWhere('country.code = :code', { code: query.toUpperCase() })
      .orderBy('country.name', 'ASC')
      .getMany();

    console.log(`[LOCATIONS] ✓ Found ${countries.length} matching countries`);

    return res.json(countries);
  } catch (error: any) {
    console.error('[LOCATIONS ERROR] Country search failed:', error?.message);
    return res.status(500).json({ 
      message: 'Failed to search countries',
      error: error?.message 
    });
  }
});

// GET /locations/admin/countries-full - Admin endpoint: countries WITH nested cities (for debugging/admin UI)
router.get('/admin/countries-full', async (req: Request, res: Response) => {
  try {
    const { countryRepository, cityRepository } = getRepositories();

    console.log('[LOCATIONS] Admin: Fetching all countries with nested cities');

    const countries = await countryRepository.find({
      order: { name: 'ASC' }
    });

    console.log(`[LOCATIONS] Admin: Processing ${countries.length} countries`);

    // Build result with nested cities
    const result: any[] = [];
    
    for (const country of countries) {
      const cities = await cityRepository.find({
        where: { countryId: country.id },
        order: { name: 'ASC' }
      });

      result.push({
        id: country.id,
        name: country.name,
        code: country.code,
        flag: country.flag,
        createdAt: country.createdAt,
        updatedAt: country.updatedAt,
        cities: cities.map(c => ({
          id: c.id,
          name: c.name,
          state: c.state,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        }))
      });
    }

    console.log(`[LOCATIONS] Admin: ✓ Returning ${result.length} countries with cities`);

    return res.json(result);
  } catch (error: any) {
    console.error('[LOCATIONS ERROR] Admin fetch failed:', error?.message);
    return res.status(500).json({ 
      message: 'Failed to fetch countries with cities',
      error: error?.message 
    });
  }
});

// GET /locations/health - Health check for locations service
router.get('/health', (req: Request, res: Response) => {
  console.log('[LOCATIONS] Health check');
  return res.json({ status: 'ok', service: 'locations' });
});

export default router;
