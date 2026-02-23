"use client";

import { QrContentType } from "@prisma/client";
import { UrlForm } from "./url-form";
import { TextForm } from "./text-form";
import { EmailForm } from "./email-form";
import { PhoneForm } from "./phone-form";
import { SmsForm } from "./sms-form";
import { WifiForm } from "./wifi-form";
import { VcardForm } from "./vcard-form";
import { LocationForm } from "./location-form";
import { PdfForm } from "./pdf-form";
import { ImageForm } from "./image-form";
import { VideoForm } from "./video-form";
import { Mp3Form } from "./mp3-form";
import { MenuForm } from "./menu-form";
import { BusinessForm } from "./business-form";
import { LinkListForm } from "./link-list-form";
import { CouponForm } from "./coupon-form";
import { AppStoreForm } from "./app-store-form";
import { InstagramForm } from "./instagram-form";
import { FacebookForm } from "./facebook-form";
import { WhatsappForm } from "./whatsapp-form";
import { SocialLinksForm } from "./social-links-form";

type Props = {
  type: QrContentType;
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  workspaceId: string;
};

export function QrContentForm({ type, payload, onChange, workspaceId }: Props) {
  switch (type) {
    case "URL":
      return <UrlForm payload={payload} onChange={onChange} />;
    case "TEXT":
      return <TextForm payload={payload} onChange={onChange} />;
    case "EMAIL":
      return <EmailForm payload={payload} onChange={onChange} />;
    case "PHONE":
      return <PhoneForm payload={payload} onChange={onChange} />;
    case "SMS":
      return <SmsForm payload={payload} onChange={onChange} />;
    case "WIFI":
      return <WifiForm payload={payload} onChange={onChange} />;
    case "VCARD":
      return <VcardForm payload={payload} onChange={onChange} />;
    case "LOCATION":
      return <LocationForm payload={payload} onChange={onChange} />;
    case "PDF":
      return <PdfForm payload={payload} onChange={onChange} workspaceId={workspaceId} />;
    case "IMAGE":
      return <ImageForm payload={payload} onChange={onChange} workspaceId={workspaceId} />;
    case "VIDEO":
      return <VideoForm payload={payload} onChange={onChange} workspaceId={workspaceId} />;
    case "MP3":
      return <Mp3Form payload={payload} onChange={onChange} workspaceId={workspaceId} />;
    case "MENU":
      return <MenuForm payload={payload} onChange={onChange} />;
    case "BUSINESS":
      return <BusinessForm payload={payload} onChange={onChange} workspaceId={workspaceId} />;
    case "LINK_LIST":
      return <LinkListForm payload={payload} onChange={onChange} />;
    case "COUPON":
      return <CouponForm payload={payload} onChange={onChange} />;
    case "APP_STORE":
      return <AppStoreForm payload={payload} onChange={onChange} />;
    case "INSTAGRAM":
      return <InstagramForm payload={payload} onChange={onChange} />;
    case "FACEBOOK":
      return <FacebookForm payload={payload} onChange={onChange} />;
    case "WHATSAPP":
      return <WhatsappForm payload={payload} onChange={onChange} />;
    case "SOCIAL_LINKS":
      return <SocialLinksForm payload={payload} onChange={onChange} />;
    default: {
      const _exhaustive: never = type;
      return <p className="text-sm text-slate-500">Неизвестный тип контента: {_exhaustive}</p>;
    }
  }
}
