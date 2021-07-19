import { error } from 'console';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    
    return [];
  });
  const [stock, setStock] = useState<Stock[]>([]);

  useEffect(() => {
    async function loadStock() {
      const { data } = await api.get('/stock');
      setStock(data);
    }
    loadStock();
  }, [])

  useEffect(() => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
  }, [cart])
  
  const addProduct = async (productId: number) => {
    try {
      // Get stock data
      const productStock = stock.find(product => product.id === productId);
      if (productStock && productStock.amount < 1) {
        throw "Quantidade solicitada fora de estoque"
      }

      // Increment amount to existing product
      const cartCopy = [...cart];
      const cartProductIndex = cart.findIndex(product => product.id === productId);
      if (cartProductIndex !== -1) {
        const product = cartCopy[cartProductIndex];
        if (productStock && productStock.amount < product.amount + 1) {
          throw "Quantidade solicitada fora de estoque"
        }
        product.amount++;
        setCart(cartCopy)
        return;
      }

      // Add new product to cart
      const { data } = await api.get('/products');
      const product = data.find((product: Product) => product.id === productId);
      product.amount = 1;
      setCart([...cart, product]);
      
    } catch(error) {
      toast.error(error);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId);
      if (productIndex === -1) throw 'Erro na remoção do produto'
      const cartCopy = [...cart];
      cartCopy.splice(productIndex, 1);
      setCart(cartCopy);
    } catch(error) {
      toast.error(error)
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;
      const stockIndex = stock.findIndex(product => product.id === productId);
      if (amount > stock[stockIndex].amount) {
        throw 'Quantidade solicitada fora de estoque';
      }
      const cartCopy = cart;
      const productIndex = cartCopy.findIndex(product => product.id === productId);
      cartCopy[productIndex].amount = amount;
      setCart([...cartCopy]);
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
