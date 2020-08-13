import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const checkCustomer = await this.customersRepository.findById(customer_id);

    if (!checkCustomer) {
      throw new AppError('Customer not exist.');
    }

    const checkProducts = await this.productsRepository.findAllById(products);

    if (!checkProducts.length) {
      throw new AppError('Products not exist.');
    }

    if (checkProducts.length !== products.length) {
      throw new AppError('Products not exist.');
    }

    const findProductsWithNoQuantity = products.filter(
      product =>
        checkProducts.filter(p => p.id === product.id)[0].quantity <
        product.quantity,
    );

    if (findProductsWithNoQuantity.length) {
      throw new AppError('Products not have quantity.');
    }

    const productsToSave = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: checkProducts.filter(p => p.id === product.id)[0].price,
    }));

    const order = await this.ordersRepository.create({
      customer: checkCustomer,
      products: productsToSave,
    });

    const { order_products } = order;

    const orderProductsQuantity = order_products.map(product => ({
      id: product.product_id,
      quantity:
        checkProducts.filter(p => p.id === product.product_id)[0].quantity -
        product.quantity,
    }));

    await this.productsRepository.updateQuantity(orderProductsQuantity);

    return order;
  }
}

export default CreateOrderService;
