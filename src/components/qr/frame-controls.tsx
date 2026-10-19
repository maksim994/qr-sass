"use client";
import { useId } from "react";
import { QR_FRAMES, FRAME_CAPTIONS, framePalette, type FrameConfig } from "@/lib/qr-frame";
import { FramePicker } from "./frame-picker";
export function FrameControls({ value, onChange, captions = FRAME_CAPTIONS, showTemplates = true }: { value: FrameConfig; onChange: (patch: FrameConfig) => void; captions?: string[]; showTemplates?: boolean }) {
  const id = useId();
  return <fieldset className="qrs-frame-controls"><legend>Рамка и подпись</legend>
    {showTemplates && <><FramePicker value={value} onChange={onChange}/><label htmlFor={`${id}-style`}>Все шаблоны<select aria-label="Шаблон рамки" id={`${id}-style`} value={value.frameStyle ?? "none"} onChange={e=>onChange({frameStyle:e.target.value,frameTextColor:undefined})}>{QR_FRAMES.map(f=><option value={f.id} key={f.id}>{f.label}</option>)}</select></label></>}
    {value.frameStyle && value.frameStyle !== "none" && <><label htmlFor={`${id}-text`}>Подпись<input aria-label="Подпись рамки" id={`${id}-text`} maxLength={24} value={value.frameText ?? ""} placeholder="Сканируйте код" onChange={e=>onChange({frameText:e.target.value})}/></label><div className="qrs-frame-captions">{captions.map(text=><button type="button" key={text} aria-pressed={value.frameText===text} onClick={()=>onChange({frameText:text})}>{text}</button>)}</div><label htmlFor={`${id}-color`}>Цвет рамки<input type="color" id={`${id}-color`} value={value.frameColor ?? "#111111"} onChange={e=>onChange({frameColor:e.target.value})}/></label><label htmlFor={`${id}-ink`}>Цвет подписи<input type="color" id={`${id}-ink`} value={framePalette(value).text} onChange={e=>onChange({frameTextColor:e.target.value})}/></label></>}
  </fieldset>;
}
