import { createContext, ReactNode, useContext, useState } from 'react';
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
      return JSON.parse(storagedCart)
    }

    return []
  });

  const addProduct = async (productId: number) => {
    try {
      const productClick = cart.find((product) => product.id === productId);
      const stockResponse = await api.get<Stock>(`stock/${productId}`);
      const { amount } = stockResponse.data;

      if (!productClick) {
        const response = await api.get<Product>(`products/${productId}`);
        const productData = response.data;
        const product = {...productData, amount: 1};
        localStorage.setItem("@RocketShoes:cart",
        JSON.stringify([...cart, product]));

        setCart([...cart, product]);
        toast('Adicionando no carrinho')
      } else {
        if (amount < productClick.amount + 1) {
          toast.error(`Quantidade solicitada fora de estoque`);
          return;
        }
        const addCart = cart.map((product) =>
          product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : { ...product }
        );
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(addCart));

        setCart(addCart);
        toast('Adicionando no carrinho')
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(cartProduct => cartProduct.id === productId);

      if(!productExists) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const updatedCart = cart.filter(cartItem => cartItem.id !== productId);
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) {
        toast.error("Erro na alteração da quantidade do produto");
        return;
      }

      const response = await api.get(`stock/${productId}`);
      const productAmount  = response.data.amount
      const stockIsNotAvailable = amount > productAmount;

      if(stockIsNotAvailable) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const productExists = cart.some(cartProduct => cartProduct.id === productId);

      if(!productExists) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      const updatedCart = cart.map(cartItem => cartItem.id === productId ? {
        ...cartItem,
        amount: amount
      }: cartItem)

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));

    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
