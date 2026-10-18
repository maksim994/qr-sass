"use client";
import { createContext, useContext } from "react";
import { COMMERCIAL } from "@/lib/commercial-config";
const OfferContext = createContext({ proPrice: Number(COMMERCIAL.pro.priceRub), businessPrice: Number(COMMERCIAL.business.priceRub) });
export const usePublicOffer = () => useContext(OfferContext);
export function PublicOfferProvider({value,children}:{value:{proPrice:number;businessPrice:number};children:React.ReactNode}) {return <OfferContext.Provider value={value}>{children}</OfferContext.Provider>;}
