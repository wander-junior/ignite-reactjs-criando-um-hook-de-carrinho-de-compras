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
  
  const addProduct = async (productId: number) => {
    try {
      // Get stock data
      const {data: productStock} = await api.get<Stock>(`/stock/${productId}`);

      // Increment amount to existing product
      const cartCopy = [...cart];
      const cartProduct = cartCopy.find(product => product.id === productId);
      if (cartProduct) {
        if (productStock.amount < cartProduct.amount + 1) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        cartProduct.amount++;
        setCart([...cartCopy]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy))
        return;
      }

      // Add new product to cart
      const { data: product } = await api.get<Product>(`/products/${productId}`);
      cartCopy.push({...product, amount: 1})
      setCart([...cartCopy]);      
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartCopy = [...cart];
      const productIndex = cartCopy.findIndex(product => product.id === productId);
      if (productIndex === -1) throw 'Erro na remoção do produto'
      cartCopy.splice(productIndex, 1);
      setCart([...cartCopy]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy))
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
      const {data: productStock} = await api.get<Stock>(`/stock/${productId}`)
      if (amount > productStock.amount) {
        throw 'Quantidade solicitada fora de estoque';
      }
      const cartCopy = [...cart];
      const productIndex = cartCopy.findIndex(product => product.id === productId);
      cartCopy[productIndex].amount = amount;
      setCart([...cartCopy]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy))
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
