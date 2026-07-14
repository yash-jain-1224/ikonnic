import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  const prismaMock = {
    product: { findUnique: jest.fn() },
    cart: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    cartItem: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  const product = { id: 'album-1', price: 1299, isActive: true };
  const firstCustomisation = {
    templateId: 'travel-album-v1',
    slotAssignments: { 'page-1-photo-1': { photoId: 'photo-a' } },
  };
  const secondCustomisation = {
    templateId: 'travel-album-v1',
    slotAssignments: { 'page-1-photo-1': { photoId: 'photo-b' } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CartService(prismaMock as unknown as PrismaService);
  });

  it('keeps separately customised copies of the same album as distinct items when added', async () => {
    prismaMock.product.findUnique.mockResolvedValue(product);
    prismaMock.cart.findFirst.mockResolvedValue({ id: 'cart-1' });
    prismaMock.cartItem.create.mockImplementation(async ({ data }: any) => ({ id: 'item', ...data }));

    await service.addItem('user-1', undefined, {
      productId: product.id,
      customisationJson: firstCustomisation,
    });
    await service.addItem('user-1', undefined, {
      productId: product.id,
      customisationJson: secondCustomisation,
    });

    expect(prismaMock.cartItem.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
    expect(prismaMock.cartItem.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.cartItem.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          cartId: 'cart-1',
          productId: product.id,
          customisationJson: firstCustomisation,
        }),
      }),
    );
    expect(prismaMock.cartItem.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          cartId: 'cart-1',
          productId: product.id,
          customisationJson: secondCustomisation,
        }),
      }),
    );
  });

  it('keeps separately customised guest album items distinct when merging into a user cart', async () => {
    const guestItems = [
      {
        id: 'guest-item-1',
        productId: product.id,
        quantity: 1,
        unitPrice: 1299,
        optionsPrice: 0,
        discount: 0,
        selectedOptions: {},
        uploadedImagePreview: null,
        uploadedImageRef: null,
        previewImage: null,
        customisationJson: firstCustomisation,
      },
      {
        id: 'guest-item-2',
        productId: product.id,
        quantity: 1,
        unitPrice: 1299,
        optionsPrice: 0,
        discount: 0,
        selectedOptions: {},
        uploadedImagePreview: null,
        uploadedImageRef: null,
        previewImage: null,
        customisationJson: secondCustomisation,
      },
    ];

    prismaMock.cart.findFirst.mockImplementation(async ({ where }: any) => {
      if (where.guestSessionId === 'guest-1') return { id: 'guest-cart', items: guestItems };
      if (where.userId === 'user-1') return { id: 'user-cart' };
      return null;
    });
    prismaMock.cartItem.create.mockResolvedValue({});
    prismaMock.cart.delete.mockResolvedValue({});

    await service.mergeGuestCart('guest-1', 'user-1');

    expect(prismaMock.cartItem.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.cartItem.update).not.toHaveBeenCalled();
    expect(prismaMock.cartItem.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.cartItem.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          cartId: 'user-cart',
          productId: product.id,
          customisationJson: firstCustomisation,
        }),
      }),
    );
    expect(prismaMock.cartItem.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          cartId: 'user-cart',
          productId: product.id,
          customisationJson: secondCustomisation,
        }),
      }),
    );
  });

  it('rejects cart creation without a user or guest identity', async () => {
    const getOrCreateCart = (service as unknown as {
      getOrCreateCart: (userId?: string, guestSessionId?: string) => Promise<unknown>;
    }).getOrCreateCart;

    await expect(getOrCreateCart()).rejects.toThrow(BadRequestException);
    expect(prismaMock.cart.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.cart.create).not.toHaveBeenCalled();
  });
});
