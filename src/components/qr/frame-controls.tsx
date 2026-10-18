"use client";
import { useId } from "react";
import { QR_FRAMES, FRAME_CAPTIONS, type FrameConfig } from "@/lib/qr-frame";
export function FrameControls({ value, onChange }: { value: FrameConfig; onChange: (patch: FrameConfig) => void }) {
  const id = useId();
  return <fieldset className="qrs-frame-controls"><legend>Рамка с призывом</legend>
    <label htmlFor={`${id}-style`}>Шаблон<select id={`${id}-style`} value={value.frameStyle ?? "none"} onChange={e=>onChange({frameStyle:e.target.value})}>{QR_FRAMES.map(f=><option value={f.id} key={f.id}>{f.label}</option>)}</select></label>
    {value.frameStyle && value.frameStyle !== "none" && <><label htmlFor={`${id}-text`}>Подпись<input id={`${id}-text`} maxLength={24} value={value.frameText ?? ""} placeholder="Сканируй меня" onChange={e=>onChange({frameText:e.target.value})}/></label><div className="qrs-frame-captions">{FRAME_CAPTIONS.map(text=><button type="button" key={text} onClick={()=>onChange({frameText:text})}>{text}</button>)}</div><label htmlFor={`${id}-color`}>Цвет рамки<input type="color" id={`${id}-color`} value={value.frameColor ?? "#111111"} onChange={e=>onChange({frameColor:e.target.value})}/></label><label htmlFor={`${id}-ink`}>Цвет подписи<input type="color" id={`${id}-ink`} value={value.frameTextColor ?? value.frameColor ?? "#111111"} onChange={e=>onChange({frameTextColor:e.target.value})}/></label></>}
  </fieldset>;
}
