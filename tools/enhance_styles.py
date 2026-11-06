import re

with open('src/ui/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Update .itabs to support 5 tabs with responsive beauty
old_itabs = ".itabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:12px}.itabs button{padding:9px 2px;font-size:12.5px}"
new_itabs = """.itabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin-bottom:14px;padding:3px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:15px}
.itabs button{padding:9px 2px;font-size:12px;font-weight:600;border-radius:12px;transition:all .2s cubic-bezier(.2,.8,.2,1);border:1px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.itabs button[aria-pressed="true"]{background:linear-gradient(135deg,rgba(242,184,75,.32),rgba(242,184,75,.12));border-color:rgba(242,184,75,.65);color:#fff;box-shadow:0 4px 14px rgba(242,184,75,.22)}"""

assert old_itabs in css, "old_itabs not found in styles.css"
css = css.replace(old_itabs, new_itabs)

# 2. Update .coin for 3D minted gold relief
old_coin = ".coin{display:inline-block;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f2b84b 45%,#b97a1c);box-shadow:inset 0 0 0 1.5px rgba(120,70,0,.5);flex:0 0 auto}"
new_coin = """.coin{display:inline-block;width:17px;height:17px;border-radius:50%;background:radial-gradient(circle at 34% 26%,#fffceb 0%,#ffe169 30%,#f09d18 68%,#8f4e02 100%);box-shadow:0 2px 6px rgba(0,0,0,.45),inset 0 1px 1.5px rgba(255,255,255,.85),inset 0 -1.5px 2px rgba(80,35,0,.7),inset 0 0 0 1.2px rgba(230,165,30,.9);position:relative;flex:0 0 auto;vertical-align:-2.5px;transition:transform .15s}
.coin::before{content:"";position:absolute;inset:2.5px;border-radius:50%;border:1px dashed rgba(255,248,190,.65);box-shadow:inset 0 0 2px rgba(130,65,0,.45)}
.coin:hover{transform:scale(1.1) rotate(6deg)}"""

assert old_coin in css, "old_coin not found in styles.css"
css = css.replace(old_coin, new_coin)

# 3. Add reaction deck, shop tabs, 3D trophies, saybox deck styling, and UI beauty enhancements
additional_css = """

/* === TILETOPIA AAA VISUAL UPGRADE: REACTION DECK, 3D COINS, TROPHIES & POLISHED SCREENS === */

/* Top Profile Bar & Currency Badges */
.mp-badges{display:flex;align-items:center;gap:8px}
.mpc{display:inline-flex;align-items:center;gap:5px;padding:4px 9px 4px 7px;border-radius:999px;background:linear-gradient(135deg,rgba(242,184,75,.2),rgba(242,184,75,.05));border:1px solid rgba(242,184,75,.45);color:var(--ink);font:700 12.5px var(--f-display);box-shadow:0 2px 8px rgba(0,0,0,.25);transition:all .18s}
.mpc:hover{border-color:rgba(242,184,75,.8);transform:translateY(-1px);box-shadow:0 4px 12px rgba(242,184,75,.3)}
.mpc b{color:#ffd56b}
.mpg{display:inline-flex;align-items:center;gap:5px;padding:4px 9px 4px 7px;border-radius:999px;background:linear-gradient(135deg,rgba(255,215,0,.18),rgba(255,255,255,.05));border:1px solid rgba(242,184,75,.4);color:var(--ink);font:700 12.5px var(--f-display);box-shadow:0 2px 8px rgba(0,0,0,.25);transition:all .18s}
.mpg:hover{border-color:rgba(242,184,75,.75);transform:translateY(-1px)}
.mpg b{color:#ffe58f}

/* Trophy & Cup Badges */
.cup-ic{display:inline-block;filter:drop-shadow(0 2px 6px rgba(242,184,75,.55));transform:scale(1.08)}
.lead-cups-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:linear-gradient(135deg,rgba(242,184,75,.22),rgba(242,184,75,.06));border:1px solid rgba(242,184,75,.4);color:#ffd875;font:700 13px var(--f-display);box-shadow:0 3px 10px rgba(0,0,0,.25)}
.pod-cups{font:800 13.5px var(--f-display);color:#ffd875;text-shadow:0 2px 8px rgba(242,184,75,.45)}
.rchip.cup{background:linear-gradient(135deg,rgba(242,184,75,.22),rgba(242,184,75,.06));border-color:rgba(242,184,75,.6);box-shadow:0 3px 10px rgba(242,184,75,.25)}

/* Lobby Cups Badge Switch */
.cupsbadge{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);transition:all .22s cubic-bezier(.2,.8,.2,1);box-shadow:0 4px 16px rgba(0,0,0,.25)}
.cupsbadge.on{background:linear-gradient(150deg,rgba(242,184,75,.22),rgba(239,122,47,.12));border-color:rgba(242,184,75,.65);box-shadow:0 6px 22px rgba(242,184,75,.25)}
.cupsbadge.host:hover{border-color:rgba(242,184,75,.85);transform:translateY(-1.5px);box-shadow:0 8px 24px rgba(242,184,75,.3)}
.cupsbadge.host:active{transform:scale(.985)}
.cups-switch-track{width:50px;height:28px;border-radius:14px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);position:relative;transition:all .24s cubic-bezier(.3,1.4,.5,1);flex-shrink:0}
.cups-switch-knob{position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.4);transition:all .24s cubic-bezier(.3,1.4,.5,1)}
.cupsbadge.on .cups-switch-track{background:linear-gradient(135deg,#f2994a,#f2b84b);border-color:rgba(255,255,255,.4);box-shadow:0 0 14px rgba(242,184,75,.5)}
.cupsbadge.on .cups-switch-knob{transform:translateX(22px);background:#fffef5;box-shadow:0 2px 8px rgba(0,0,0,.45)}

/* Bottom Navigation Bar Polish */
.bnav{background:rgba(16,23,41,.88);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.08);box-shadow:0 -8px 26px rgba(0,0,0,.35)}
.bnav button{transition:all .2s cubic-bezier(.2,.8,.2,1);position:relative}
.bnav button svg{transition:transform .22s cubic-bezier(.3,1.4,.5,1)}
.bnav button.sel{color:#f5c04e}
.bnav button.sel svg{transform:translateY(-2px) scale(1.1);filter:drop-shadow(0 3px 8px rgba(245,192,78,.55))}
.bnav button.sel::after{content:"";position:absolute;bottom:4px;left:50%;transform:translateX(-50%);width:18px;height:3px;border-radius:2px;background:linear-gradient(90deg,#f2994a,#f5c04e);box-shadow:0 0 10px rgba(245,192,78,.8)}

/* Reaction Deck & Customization in "Мои предметы" */
.deck-summary-card{margin-bottom:16px;padding:16px;border-radius:20px;background:linear-gradient(145deg,rgba(242,184,75,.14),rgba(255,255,255,.04));border:1px solid rgba(242,184,75,.35);box-shadow:0 12px 32px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.15);position:relative;overflow:hidden}
.deck-summary-card::before{content:"";position:absolute;top:-40px;right:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(242,184,75,.2),transparent 70%);pointer-events:none}
.deck-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
.deck-title{display:flex;align-items:center;gap:10px}
.deck-icon{font-size:24px;line-height:1;filter:drop-shadow(0 2px 6px rgba(242,184,75,.5))}
.deck-title b{display:block;font:700 15px var(--f-display);color:var(--ink);letter-spacing:-.01em}
.deck-title small{color:var(--muted);font-size:12px;line-height:1.35;display:block;margin-top:2px}

.deck-slots-box{display:flex;flex-direction:column;gap:14px}
.deck-slot-group{display:flex;flex-direction:column;gap:8px}
.deck-slot-title{display:flex;justify-content:space-between;align-items:center;font:600 12px var(--f-body);color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.deck-count{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.08);font:700 11px var(--f-display);color:var(--ink);border:1px solid rgba(255,255,255,.1)}
.deck-count.full{background:rgba(242,184,75,.2);color:#ffd875;border-color:rgba(242,184,75,.5)}

.deck-active-emotes{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.deck-active-chip{display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;transition:all .18s cubic-bezier(.2,.8,.2,1);position:relative}
.deck-active-chip.e{height:52px;font-size:26px;border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.04));border:1.5px solid rgba(242,184,75,.55);box-shadow:0 4px 14px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.2)}
.deck-active-chip.e:hover{transform:translateY(-2px) scale(1.05);border-color:rgba(242,184,75,.9);box-shadow:0 6px 18px rgba(242,184,75,.35)}
.deck-active-chip.e:active{transform:scale(.92)}
.deck-active-chip.e::after{content:"✕";position:absolute;top:2px;right:4px;font-size:10px;font-weight:800;color:rgba(255,255,255,.6);transition:color .15s}
.deck-active-chip.e:hover::after{color:#ff8a80}

.deck-empty-chip{display:flex;align-items:center;justify-content:center;border-radius:14px;border:1.5px dashed rgba(255,255,255,.18);color:rgba(255,255,255,.3);font-size:18px;font-weight:300;height:52px;background:rgba(255,255,255,.02);user-select:none}
.deck-empty-chip.t{height:40px;font-size:15px;border-radius:12px}

.deck-active-phrases{display:flex;flex-direction:column;gap:6px}
.deck-active-chip.t{padding:8px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(242,184,75,.15),rgba(255,255,255,.04));border:1.2px solid rgba(242,184,75,.5);font:600 13px var(--f-body);color:var(--ink);box-shadow:0 3px 10px rgba(0,0,0,.25);justify-content:space-between}
.deck-active-chip.t:hover{border-color:rgba(242,184,75,.85);transform:translateX(2px)}
.deck-active-chip.t::after{content:"✕";font-size:11px;font-weight:700;color:rgba(255,255,255,.5);margin-left:8px}
.deck-active-chip.t:hover::after{color:#ff8a80}

/* Emotes Catalog Grid in Items */
.emotes-catalog-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:20px}
.em-cat-btn{height:54px;display:flex;align-items:center;justify-content:center;position:relative;border-radius:14px;background:rgba(255,255,255,.05);border:1.2px solid rgba(255,255,255,.1);cursor:pointer;transition:all .18s cubic-bezier(.2,.8,.2,1);outline:none}
.em-cat-btn .em-icon{font-size:26px;line-height:1;transition:transform .18s cubic-bezier(.3,1.4,.5,1)}
.em-cat-btn .em-badge{position:absolute;top:3px;right:3px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.15);color:rgba(255,255,255,.7);font:700 10px var(--f-body);display:flex;align-items:center;justify-content:center;transition:all .18s}
.em-cat-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);transform:translateY(-1.5px)}
.em-cat-btn:hover .em-icon{transform:scale(1.15)}
.em-cat-btn:active{transform:scale(.92)}
.em-cat-btn.sel{background:linear-gradient(145deg,rgba(242,184,75,.28),rgba(242,184,75,.08));border-color:rgba(242,184,75,.8);box-shadow:0 4px 14px rgba(242,184,75,.3),inset 0 1px 0 rgba(255,255,255,.25)}
.em-cat-btn.sel .em-badge{background:#f2b84b;color:#1d2233;box-shadow:0 2px 6px rgba(0,0,0,.3)}

/* Phrases Catalog List in Items */
.phrases-catalog-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:7px;margin-bottom:24px}
.ph-cat-btn{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.05);border:1.2px solid rgba(255,255,255,.09);color:var(--ink);font:600 13px var(--f-body);cursor:pointer;transition:all .18s cubic-bezier(.2,.8,.2,1);text-align:left}
.ph-cat-btn .ph-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ph-cat-btn .ph-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,.08);color:var(--muted);transition:all .18s;flex-shrink:0}
.ph-cat-btn:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.2);transform:translateX(2px)}
.ph-cat-btn:active{transform:scale(.98)}
.ph-cat-btn.sel{background:linear-gradient(135deg,rgba(242,184,75,.2),rgba(242,184,75,.05));border-color:rgba(242,184,75,.75);box-shadow:0 4px 14px rgba(242,184,75,.18)}
.ph-cat-btn.sel .ph-badge{background:linear-gradient(135deg,#f2b84b,#f2994a);color:#1d2233;box-shadow:0 2px 6px rgba(0,0,0,.3)}

/* In-Match Reactions Box Polish (#sayBox) */
.saybox{position:absolute;top:calc(58px + var(--it,0px));right:12px;left:12px;z-index:9;display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:22px;background:rgba(18,25,44,.92);-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);border:1px solid rgba(242,184,75,.35);box-shadow:0 20px 48px rgba(0,0,0,.65),0 0 24px rgba(242,184,75,.15);animation:sayopen .28s cubic-bezier(.3,1.4,.5,1);transform-origin:top right}
.saybox .sy-top{display:flex;justify-content:space-between;align-items:center;padding:0 2px}
.saybox .sy-h{font:700 11px var(--f-body);letter-spacing:.1em;text-transform:uppercase;color:#ffd875}
.saybox .sy-cnt{font:700 11px var(--f-display);color:var(--muted);background:rgba(255,255,255,.08);padding:1px 6px;border-radius:999px}
.saybox .sy-deck.sy-e{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.saybox .sy-deck.sy-e button{height:52px;font-size:28px;border-radius:15px;background:linear-gradient(145deg,rgba(255,255,255,.1),rgba(255,255,255,.03));border:1.2px solid rgba(242,184,75,.4);box-shadow:0 4px 12px rgba(0,0,0,.3);transition:all .15s cubic-bezier(.2,.8,.2,1)}
.saybox .sy-deck.sy-e button:hover{transform:translateY(-2px) scale(1.08);border-color:rgba(242,184,75,.9);background:linear-gradient(145deg,rgba(242,184,75,.25),rgba(255,255,255,.08))}
.saybox .sy-deck.sy-e button:active{transform:scale(.9)}
.saybox .sy-deck.sy-t{display:flex;flex-direction:column;gap:6px}
.saybox .sy-deck.sy-t button{height:40px;padding:0 14px;border-radius:12px;background:rgba(255,255,255,.06);border:1.2px solid rgba(255,255,255,.12);font:600 13px var(--f-body);color:var(--ink);text-align:left;transition:all .15s}
.saybox .sy-deck.sy-t button:hover{background:rgba(242,184,75,.15);border-color:rgba(242,184,75,.6);transform:translateX(3px)}
.saybox .sy-deck.sy-t button:active{transform:scale(.98)}
.saybox .sy-footer{margin-top:4px;padding-top:8px;border-top:1px solid rgba(255,255,255,.08);display:flex}
.sy-deck-btn{width:100%;padding:9px 12px;border-radius:11px;background:rgba(255,255,255,.04);border:1px dashed rgba(242,184,75,.4);color:#ffd875;font:600 12px var(--f-body);cursor:pointer;transition:all .18s;text-align:center}
.sy-deck-btn:hover{background:rgba(242,184,75,.12);border-color:rgba(242,184,75,.8)}

/* High-res Sparks Animation */
.spark{position:fixed;z-index:35;font-size:24px;pointer-events:none;filter:drop-shadow(0 4px 8px rgba(0,0,0,.45));animation:sparkFly 1.8s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes sparkFly{0%{opacity:1;transform:translate(0,0) scale(1) rotate(0deg)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.4) rotate(var(--rt))}}
"""

css += additional_css

with open('src/ui/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Successfully enhanced src/ui/styles.css")
