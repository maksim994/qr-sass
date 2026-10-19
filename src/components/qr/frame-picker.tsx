"use client";
import { memo } from "react";
import { MODERN_QR_FRAMES, type FrameConfig } from "@/lib/qr-frame";
import { HomeQrPreview } from "@/components/landing/home-qr-preview";
import s from "./frame-picker.module.css";
const Sample=memo(function Sample({style,color}:{style:string;color:string}){
  return <HomeQrPreview value="https://qr-s.ru" frame={{frameStyle:style,frameText:"Сканируйте код",frameColor:color}} />;
});
export function FramePicker({value,onChange}:{value:FrameConfig;onChange:(patch:FrameConfig)=>void}){
 return <div className={s.picker} role="group" aria-label="Оформление QR-кода">{MODERN_QR_FRAMES.map(frame=><button type="button" key={frame.id} aria-pressed={(value.frameStyle??"none")===frame.id} aria-label={`Рамка: ${frame.label}`} onClick={()=>onChange({frameStyle:frame.id,frameTextColor:undefined})}><span className={s.sample} aria-hidden="true"><Sample style={frame.id} color={value.frameColor??"#111111"}/></span><span>{frame.label}</span>{value.frameStyle===frame.id&&<span className={s.check} aria-hidden="true">✓</span>}</button>)}</div>;
}
