import { Test } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('SearchService', () => {
  let service: SearchService;

  const prismaMock = {
    product: { findMany: jest.fn() },
    category: { findMany: jest.fn() },
  };

  const redisMock = {
    getJson: jest.fn(),
    setJson: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();
    service = moduleRef.get(SearchService);
  });

  describe('search', () => {
    it('returns empty results for short query (< 2 chars)', async () => {
      const result = await service.search('a');
      expect(result).toEqual({ products: [], categories: [] });
      expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    });

    it('returns empty results for empty query', async () => {
      const result = await service.search('');
      expect(result).toEqual({ products: [], categories: [] });
    });

    it('searches products and categories for valid query', async () => {
      prismaMock.product.findMany.mockResolvedValue([
        { id: 'p1', slug: 'wall-photo', title: 'Acrylic Wall Photo', price: 699 },
      ]);
      prismaMock.category.findMany.mockResolvedValue([
        { slug: 'wall-photos', name: 'Wall Photos' },
      ]);

      const result = await service.search('wall', 10);
      expect(result.products).toHaveLength(1);
      expect(result.categories).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('respects limit parameter', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.category.findMany.mockResolvedValue([]);

      await service.search('photo', 5);
      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('autocomplete', () => {
    it('returns empty for short query', async () => {
      const result = await service.autocomplete('x');
      expect(result).toEqual([]);
    });

    it('returns cached results if available', async () => {
      const cached = [{ title: 'Cached', slug: 'cached' }];
      redisMock.getJson.mockResolvedValue(cached);

      const result = await service.autocomplete('wall');
      expect(result).toEqual(cached);
      expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    });

    it('fetches from DB and caches when no cache exists', async () => {
      redisMock.getJson.mockResolvedValue(null);
      prismaMock.product.findMany.mockResolvedValue([
        { title: 'Wall Photo', slug: 'wall-photo' },
      ]);

      const result = await service.autocomplete('wall');
      expect(result).toHaveLength(1);
      expect(redisMock.setJson).toHaveBeenCalledWith(
        'search:ac:wall',
        [{ title: 'Wall Photo', slug: 'wall-photo' }],
        300,
      );
    });
  });
});
