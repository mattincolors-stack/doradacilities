import type { CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import capturedCSS from "../styles/site.css?raw";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "HortifrutiZap — Frutas e legumes frescos" },
    { name: "description", content: "Entre com seu celular para ver o catálogo e fazer seu pedido de hortifruti." },
    { property: "og:title", content: "HortifrutiZap — Frutas e legumes frescos" },
    { property: "og:description", content: "Entre com seu celular para ver o catálogo e fazer seu pedido de hortifruti." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  staticData: { importedDocument: { html: { "lang": "en" }, body: {  } } },
  component: Index,
});

function Index() {
  return (
    <>
      <style>{capturedCSS}</style>
      <div className="flex flex-1 h-full" id="root">
        <div className="css-view-g5y9jx r-flex-13awgt0 content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0">
          <div className="css-view-g5y9jx r-flex-13awgt0 content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0">
            <div className="css-view-g5y9jx content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0" style={{ flex: "1 1 0%" }}>
              <div className="absolute [inset:0px] pointer-events-none invisible" />
              <div className="css-view-g5y9jx r-flex-13awgt0 content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0">
                <div className="css-view-g5y9jx r-flex-13awgt0 content-start items-stretch border-0 border-solid border-black bottom-0 box-border left-0 list-none min-h-0 min-w-0 absolute right-0 no-underline top-0 z-0 flex" style={{ backgroundColor: "rgb(242, 242, 242)" }}>
                  <div className="css-view-g5y9jx r-flex-13awgt0 content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0">
                    <div className="css-view-g5y9jx r-flex-13awgt0 content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0">
                      <div className="css-view-g5y9jx r-backgroundColor-14lw9ot r-flex-13awgt0 content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0">
                        <div className="css-view-g5y9jx r-flexShrink-1wbh5a2 content-start items-stretch border-0 border-solid border-black box-border grow list-none min-h-0 min-w-0 relative no-underline z-0">
                          <div className="css-view-g5y9jx r-WebkitOverflowScrolling-150rngu r-flexDirection-eqz5dr r-flexShrink-1wbh5a2 r-transform-agouwx content-start items-stretch border-0 border-solid border-black box-border grow list-none min-h-0 min-w-0 overflow-x-hidden overflow-y-auto relative no-underline z-0" {...({ contentinset: "[object Object]", scrollindicatorinsets: "[object Object]", contentinsetbottom: "0px", contentinsettop: "0px" } as any)}>
                            <div className="css-view-g5y9jx content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0 grow" style={{ paddingBottom: "24px" }}>
                              <div className="css-view-g5y9jx r-backgroundColor-u1od7y content-start items-stretch border-0 border-solid border-black box-border h-[300px] list-none min-h-0 min-w-0 relative no-underline z-0">
                                <div className="css-view-g5y9jx content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0 [overflow:hidden]" style={{ flex: "1 1 0%" }} data-expoimage="true">
                                  <div>
                                    <img className="transitioning cross-dissolve-active transition-opacity [animation-fill-mode:forwards] [object-position:left_50%_top_50%] [width:100%] [height:100%] absolute [left:0px] [top:0px] object-cover [transition-duration:300ms] [transition-timing-function:linear]" fetchPriority="auto" loading="lazy" src="/site-assets/b25bbc079e0dc250.jpg" />
                                  </div>
                                </div>
                                <div className="css-view-g5y9jx content-start items-stretch border-0 border-solid border-black bottom-0 box-border h-[160px] left-0 list-none min-h-0 min-w-0 absolute right-0 no-underline z-0" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0), rgb(255, 255, 255))" } as CSSProperties} />
                              </div>
                              <div className="css-view-g5y9jx r-marginTop-xiad99 r-paddingInline-cxgwc0 content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 relative no-underline z-0">
                                <div className="css-text-146c3p1 r-color-9hfeq1 r-fontSize-1b43r93 r-fontWeight-1vr29t4 bg-transparent border-0 border-solid border-black box-border inline tracking-[1px] list-none m-0 wrap-break-word p-0 relative text-start no-underline uppercase whitespace-pre-wrap" dir="auto">HortifrutiZap</div>
                                <div className="css-text-146c3p1 r-color-16dx0ju r-fontSize-yy2aun r-fontWeight-1vr29t4 r-lineHeight-37tt59 bg-transparent border-0 border-solid border-black box-border inline list-none m-0 mt-[8px]! wrap-break-word p-0 relative text-start no-underline whitespace-pre-wrap" dir="auto">Frutas e legumes frescos, prontos pra você</div>
                                <div className="css-text-146c3p1 r-color-nrlicp r-fontSize-a023e6 r-lineHeight-10yl4k bg-transparent border-0 border-solid border-black box-border inline list-none m-0 mt-[8px]! wrap-break-word p-0 relative text-start no-underline whitespace-pre-wrap" dir="auto">Entre com seu número de celular para ver o catálogo e fazer seu pedido.</div>
                                <div className="css-view-g5y9jx r-backgroundColor-dpirwx r-flexDirection-18u37iz r-marginTop-11c0sde r-paddingInline-3pj75a content-start items-center border-0 border-solid border-black border-site-import-border! rounded-[12px] border! box-border gap-[8px] h-[56px] list-none min-h-0 min-w-0 relative no-underline z-0">
                                  <svg fill="currentColor" viewBox="0 0 256 256" width="22" height="22" {...({ color: "#808A84" } as any)}>
                                    <g fill="#808A84">
                                      <path d="M176 16H80a24 24 0 0 0-24 24v176a24 24 0 0 0 24 24h96a24 24 0 0 0 24-24V40a24 24 0 0 0-24-24M72 64h112v128H72Zm8-32h96a8 8 0 0 1 8 8v8H72v-8a8 8 0 0 1 8-8m96 192H80a8 8 0 0 1-8-8v-8h112v8a8 8 0 0 1-8 8" />
                                    </g>
                                  </svg>
                                  <div className="css-text-146c3p1 r-color-nrlicp r-fontSize-1inkyih r-fontWeight-1kfrs79 bg-transparent border-0 border-solid border-black box-border inline list-none m-0 wrap-break-word p-0 relative text-start no-underline whitespace-pre-wrap" dir="auto">+55</div>
                                  <input className="css-textinput-11aywtz r-placeholderTextColor-6taxm2 r-color-16dx0ju r-flex-13awgt0 r-fontSize-1inkyih appearance-none bg-transparent border-0 border-solid border-black rounded-none box-border h-full m-0 p-0 resize-none" style={{ "--placeholderTextColor": "#808A84" } as CSSProperties} placeholder="(16) 99999-9999" autoCapitalize="sentences" autoComplete="on" autoCorrect="on" dir="auto" rows={1} spellCheck="true" type="tel" defaultValue="" {...({ enterkeyhint: "done", virtualkeyboardpolicy: "auto" } as any)} />
                                </div>
                                <div className="css-view-g5y9jx r-pointerEvents-12vffkv r-flexDirection-18u37iz r-paddingInline-3pj75a r-backgroundColor-17o0mgx r-opacity-icoktb content-start items-center border-0 border-solid border-black rounded-[12px] box-border gap-[8px] h-[52px] justify-center list-none min-h-0 min-w-0 pointer-events-none! relative no-underline z-0" style={{ marginTop: "24px" }} aria-disabled="true" tabIndex={-1}>
                                  <div className="css-text-146c3p1 r-fontSize-ubezar r-fontWeight-b88u0q bg-transparent border-0 border-solid border-black box-border inline list-none m-0 wrap-break-word p-0 relative text-start no-underline whitespace-pre-wrap" style={{ color: "rgb(255, 255, 255)" }} dir="auto">Receber código por SMS</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="css-view-g5y9jx r-display-hvic4v content-start items-stretch border-0 border-solid border-black box-border list-none min-h-0 min-w-0 absolute no-underline z-0" style={{ transform: "translateX(0px) translateY(0px)" }} data-site-import-responsive="35" />
          </div>
        </div>
      </div>
      <div className="lov-shadow-0" style={{ position: "absolute" }} id="error-toast">
        <div data-ce-shadow-root="lov-shadow-0" />
      </div>
    </>
  );
}
