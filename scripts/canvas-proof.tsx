import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CanvasSlide } from '../src/lessons/canvas';
export const render = (page:any, lang:string) => renderToStaticMarkup(<CanvasSlide s={{...page,title:''}} lang={lang} R={t=>t}/>);
