import {createContext,useContext} from 'react';
export const GuideSessionContext=createContext(null);
export const useGuideSession=()=>useContext(GuideSessionContext);
