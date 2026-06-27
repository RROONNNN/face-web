import { GeofenceService } from './geofence.service';

describe('GeofenceService', () => {
    function createService(config: {
        centerLat: number | null;
        centerLon: number | null;
        radiusMeters: number | null;
    } | null) {
        const repo = {
            findOne: jest.fn().mockResolvedValue(config ? { id: 'company', ...config } : null),
            findOneOrFail: jest.fn().mockResolvedValue(config ? { id: 'company', ...config } : { id: 'company' }),
            create: jest.fn((value) => value),
            save: jest.fn((value) => Promise.resolve(value)),
        };

        return {
            repo,
            service: new GeofenceService(repo as never),
        };
    }

    it('returns null when no company geofence config exists', async () => {
        const { service } = createService(null);

        await expect(service.evaluate(10.7769, 106.7009)).resolves.toBeNull();
    });

    it('returns null when config or attendance coordinates are incomplete', async () => {
        const { service } = createService({
            centerLat: 10.7769,
            centerLon: null,
            radiusMeters: 150,
        });

        await expect(service.evaluate(10.7769, 106.7009)).resolves.toBeNull();
        await expect(service.evaluate(null, 106.7009)).resolves.toBeNull();
        await expect(service.evaluate(10.7769, null)).resolves.toBeNull();
    });

    it('returns false for a point inside the configured radius', async () => {
        const { service } = createService({
            centerLat: 10.7769,
            centerLon: 106.7009,
            radiusMeters: 150,
        });

        await expect(service.evaluate(10.77695, 106.70095)).resolves.toBe(false);
    });

    it('returns true for a point outside the configured radius', async () => {
        const { service } = createService({
            centerLat: 10.7769,
            centerLon: 106.7009,
            radiusMeters: 150,
        });

        await expect(service.evaluate(10.7900, 106.7200)).resolves.toBe(true);
    });

    it('upserts the singleton company config', async () => {
        const { repo, service } = createService(null);
        repo.findOneOrFail.mockResolvedValueOnce({
            id: 'company',
            centerLat: 10.7769,
            centerLon: 106.7009,
            radiusMeters: 150,
        });

        const result = await service.upsertCompanyConfig({
            centerLat: 10.7769,
            centerLon: 106.7009,
            radiusMeters: 150,
        });

        expect(repo.create).toHaveBeenCalledWith({
            id: 'company',
            centerLat: 10.7769,
            centerLon: 106.7009,
            radiusMeters: 150,
            createdAt: undefined,
        });
        expect(repo.save).toHaveBeenCalled();
        expect(result).toMatchObject({
            id: 'company',
            radiusMeters: 150,
        });
    });
});
