import React from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

export type SageSceneName = 'dashboard' | 'ai' | 'inventory' | 'analytics' | 'market' | 'orders' | 'settings';

type Props = { scene: SageSceneName; data?: Record<string, string | number> };
const ink = '#0E4F3B';
const leaf = '#2F9E6B';
const leafLight = '#3FB67F';
const sage = '#A9BD9B';
const white = '#FFFFFF';

function ScenePlant() {
  return <>
    <Path d="M150 345C148 280 145 193 151 75" stroke={ink} strokeWidth="7" strokeLinecap="round" {...({ className: 'hg-motion-stem' } as any)} />
    <G stroke={ink} strokeWidth="2">
      <G {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': '.5s' } as any}><Path d="M149 293C107 293 78 265 72 230c42-1 72 23 77 63Z" fill={leaf} {...({ className: 'hg-motion-sway' } as any)} /></G>
      <G {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': '.65s' } as any}><Path d="M151 262c42 0 72-27 78-61-42-2-72 21-78 61Z" fill={leafLight} {...({ className: 'hg-motion-sway' } as any)} /></G>
      <G {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': '.8s' } as any}><Path d="M148 217c-36-2-61-24-67-53 37-1 63 18 67 53Z" fill="#1F7A53" {...({ className: 'hg-motion-sway' } as any)} /></G>
      <G {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': '.95s' } as any}><Path d="M152 184c37 0 62-23 68-52-38-1-64 18-68 52Z" fill={leaf} {...({ className: 'hg-motion-sway' } as any)} /></G>
      <G {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': '1.1s' } as any}><Path d="M150 141c-28-1-46-19-50-42 28 0 47 14 50 42Z" fill={leafLight} {...({ className: 'hg-motion-sway' } as any)} /></G>
      <G {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': '1.25s' } as any}><Path d="M151 115c27-1 44-18 48-40-27 0-45 13-48 40Z" fill="#1F7A53" {...({ className: 'hg-motion-sway' } as any)} /></G>
      <G {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': '1.4s' } as any}><Path d="M151 82c-17-16-17-41 0-61 17 20 17 45 0 61Z" fill={leaf} {...({ className: 'hg-motion-sway' } as any)} /></G>
    </G>
    <Path d="M150 345c-17 29-36 47-42 81m42-81c0 36 4 56 8 85m-8-85c18 29 39 44 50 78" stroke={white} strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" {...({ className: 'hg-motion-roots' } as any)} />
    <Rect x="60" y="332" width="180" height="116" rx="32" fill={white} fillOpacity=".22" stroke={white} strokeOpacity=".75" strokeWidth="2.5" />
    <Path d="M48 365q20-11 40 0t40 0 40 0 40 0 40 0 40 0v92H48z" fill={leaf} fillOpacity=".45" {...({ className: 'hg-motion-wave' } as any)} />
    {[{x:112,y:412,r:5},{x:190,y:390,r:7},{x:155,y:429,r:4},{x:215,y:427,r:3}].map((b,i)=><Circle key={i} cx={b.x} cy={b.y} r={b.r} fill={white} fillOpacity=".8" {...({ className: 'hg-motion-bubble' } as any)} />)}
  </>;
}

function DashboardScene({ data = {} }: Props) {
  const badges = [
    { x: 6, y: 80, label: 'pH', value: data.ph ?? '6.1', color: '#A855F7' },
    { x: 176, y: 56, label: 'EC', value: data.ec ?? '1.8', color: leaf },
    { x: 3, y: 236, label: 'Temp', value: data.temperature ?? '23°', color: '#0E4F3B' },
    { x: 177, y: 225, label: 'Humidity', value: data.humidity ?? '64%', color: '#0E4F3B' },
  ];
  return <>
    <Ellipse cx="150" cy="205" rx="143" ry="116" stroke={white} strokeOpacity=".4" strokeDasharray="5 8" />
    <ScenePlant />
    {badges.map((b, i) => <G key={b.label} {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': `${i * .18}s` } as any}>
      <Rect x={b.x} y={b.y} width="108" height="56" rx="16" fill={white} fillOpacity=".82" stroke={white} strokeOpacity=".7" />
      <Circle cx={b.x + 18} cy={b.y + 19} r="10" fill={b.color} fillOpacity=".18" />
      <Circle cx={b.x + 18} cy={b.y + 19} r="7" stroke={b.color} strokeWidth="2" fill="none" {...({ className: 'hg-motion-pulse' } as any)} />
      <Circle cx={b.x + 87} cy={b.y + 28} r="12" stroke={b.color} strokeOpacity=".22" strokeWidth="3" fill="none" />
      <Circle cx={b.x + 87} cy={b.y + 28} r="12" stroke={b.color} strokeWidth="3" strokeDasharray="58 75" strokeLinecap="round" fill="none" transform={`rotate(-90 ${b.x + 87} ${b.y + 28})`} {...({ className: 'hg-motion-gauge' } as any)} />
      <SvgText x={b.x + 34} y={b.y + 23} fill={ink} fontSize="12" fontWeight="700">{b.label}</SvgText>
      <SvgText x={b.x + 13} y={b.y + 45} fill={ink} fontSize="15" fontWeight="800" {...({ className: 'hg-motion-count' } as any)}>{String(b.value)}</SvgText>
    </G>)}
  </>;
}

function InventoryScene() {
  return <>
    <G stroke={white} strokeOpacity=".85" strokeWidth="4" strokeLinecap="round">
      <Path d="M35 355h230M45 280h210M55 205h190M67 130h166" />
      <Path d="M48 90v298M252 90v298" />
    </G>
    {[0,1,2].map((row) => <G key={row}>
      {[0,1,2,3].map((col) => {
        const x = 63 + col * 48; const y = 95 + row * 75;
        return <G key={`${row}-${col}`} {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': `${(row * 4 + col) * .08}s` } as any}>
          <Rect x={x} y={y + 25} width="34" height="28" rx="6" fill={white} fillOpacity=".55" stroke={white} strokeOpacity=".8" />
          <Path d={`M${x+17} ${y+25}v-15m0 8c-11 0-14-7-14-13 9 0 14 4 14 13m0-3c10 0 14-7 14-13-9 0-14 4-14 13`} fill={leaf} stroke={ink} strokeWidth="1.3" {...({ className: 'hg-motion-sway' } as any)} />
        </G>;
      })}
    </G>)}
    <G {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': '.7s' } as any}>
      <Path d="M214 322h42l-5 65h-32z" fill={white} fillOpacity=".34" stroke={white} strokeOpacity=".8" strokeWidth="2" />
      <Path d="M217 360h36v24h-36z" fill={leaf} fillOpacity=".7" {...({ className: 'hg-motion-stock' } as any)} />
      <Rect x="222" y="311" width="26" height="14" rx="5" fill={white} fillOpacity=".7" />
      <Path d="M218 351h34" stroke={white} strokeOpacity=".75" strokeWidth="2" />
    </G>
    <G {...({ className: 'hg-motion-pulse' } as any)}><Circle cx="76" cy="354" r="6" fill="#D97706" /><Circle cx="76" cy="354" r="13" stroke="#D97706" strokeOpacity=".6" fill="none" /></G>
  </>;
}

function AnalyticsScene({ data = {} }: Props) {
  const heights = [70, 115, 88, 154, 130, 188];
  return <>
    <G opacity=".55" stroke={white} strokeOpacity=".45">
      {[0,1,2,3,4].map((i)=><Line key={i} x1="30" y1={120+i*52} x2="278" y2={120+i*52} strokeDasharray="3 6" />)}
    </G>
    <G fill={leaf} opacity=".55">
      {heights.map((h,i)=><Rect key={i} x={42+i*34} y={360-h} width="18" height={h} rx="9" {...({ className: 'hg-motion-bar' } as any)} style={{ '--hg-delay': `${i*.12}s` } as any} />)}
    </G>
    <Path d="M34 280C72 268 80 216 113 230S154 186 183 197s54-70 95-82" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" strokeDasharray="420" strokeDashoffset="420" {...({ className: 'hg-motion-stem' } as any)} />
    {[[72,258],[113,230],[183,197],[278,115]].map(([x,y],i)=><G key={i} {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': `${.4+i*.2}s` } as any}>
      <Circle cx={x} cy={y} r="7" fill={white} stroke={leaf} strokeWidth="4" {...({ className: 'hg-motion-marker' } as any)} />
      <Path d={`M${x} ${y}q-20-30-32-18q3 22 32 18`} fill={leafLight} stroke={ink} strokeWidth="1.3" />
    </G>)}
    <G>
      <Circle cx="232" cy="320" r="52" stroke={white} strokeOpacity=".35" strokeWidth="15" fill="none" />
      <Circle cx="232" cy="320" r="52" stroke={leaf} strokeWidth="15" fill="none" strokeDasharray="218 326" strokeLinecap="round" transform="rotate(-90 232 320)" {...({ className: 'hg-motion-dash' } as any)} />
      <SvgText x="232" y="326" textAnchor="middle" fill={ink} fontSize="18" fontWeight="800">{String(data.score ?? '91%')}</SvgText>
    </G>
  </>;
}

function MarketScene({ data = {} }: Props) {
  return <>
    <Ellipse cx="149" cy="411" rx="102" ry="8" fill="rgba(14,79,59,.25)" {...({ className: 'hg-market-ground-shadow' } as any)} />
    <G {...({ className: 'hg-motion-pop' } as any)}>
      <Path d="M75 261c-12-52 7-97 44-121 25 37 20 84-15 121m30 0c0-56 31-94 74-104 11 48-14 87-62 104" fill={leaf} stroke={ink} strokeWidth="2" {...({ className: 'hg-motion-sway' } as any)} />
      <Path d="M91 262c2-38 21-65 48-80m5 80c16-39 38-58 67-67" stroke="#CDEEDB" strokeOpacity=".8" strokeWidth="2" />
      <Path d="M48 260h202l-20 143H69z" fill="rgba(14,79,59,.16)" stroke="#EAF6EF" strokeWidth="3" strokeOpacity=".9" />
      <Path d="M58 320q18-10 36 0t36 0 36 0 36 0 36 0l-12 77H71z" fill={leaf} fillOpacity=".55" />
      <Path d="M58 320q18-10 36 0t36 0 36 0 36 0 36 0" fill="none" stroke="#CDEEDB" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M48 260l25 143m177-143-22 143M48 260l45 143m157-143-47 143M63 316h177M57 355h190" stroke="#CDEEDB" strokeOpacity=".55" strokeWidth="2" />
    </G>
    <G {...({ className: 'hg-motion-pop' } as any)} style={{ '--hg-delay': '.4s' } as any}>
      <G {...({ className: 'hg-market-price-tag' } as any)}>
        <G transform="rotate(-8 227 83)">
          <Rect x="162" y="58" width="130" height="50" rx="9" fill="#FFFFFF" />
          <SvgText x="227" y="88" fill={ink} textAnchor="middle" fontFamily="Manrope" fontSize="15" fontWeight="700">₹50/per kg</SvgText>
        </G>
      </G>
      <Path d="M154 58h-8v8" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="58" cy="185" r="20" fill="rgba(255,255,255,.35)" stroke="#EAF6EF" strokeWidth="2" {...({ className: 'hg-motion-bubble' } as any)} />
      <SvgText x="58" y="190" fill={ink} textAnchor="middle" fontSize="15" fontWeight="800">₹</SvgText>
    </G>
    <Path d="M54 151C111 123 137 148 176 113s54-42 90-56" fill="none" stroke="#CDEEDB" strokeWidth="4" strokeLinecap="round" strokeDasharray="260" strokeDashoffset="260" {...({ className: 'hg-motion-stem' } as any)} />
    {[{x:84,y:180},{x:124,y:177},{x:173,y:150}].map((c,i)=><Circle key={i} cx={c.x} cy={c.y} r="8" fill="rgba(255,255,255,.35)" stroke="#EAF6EF" strokeWidth="1.5" {...({ className: 'hg-motion-marker' } as any)} />)}
  </>;
}

function OrdersScene() {
  return <>
    <Path d="M24 283c44-40 76 26 124-9 40-30 68-34 110-21" fill="none" stroke={white} strokeOpacity=".85" strokeWidth="3" strokeDasharray="8 8" />
    {[{x:34,y:276},{x:149,y:273},{x:255,y:251}].map((p,i)=><G key={i} {...({ className: 'hg-motion-marker' } as any)} style={{ '--hg-delay': `${i*.25}s` } as any}><Circle cx={p.x} cy={p.y} r="10" fill={white} /><Circle cx={p.x} cy={p.y} r="4" fill={leaf} /></G>)}
    <G {...({ className: 'hg-motion-pop' } as any)}>
      <Path d="M66 120l81-38 84 38-83 42z" fill={white} fillOpacity=".65" stroke={white} strokeOpacity=".9" strokeWidth="2" {...({ className: 'hg-motion-fold' } as any)} />
      <Path d="M66 120v101l82 43V162zm166 0v101l-84 43V162z" fill={sage} fillOpacity=".65" stroke={white} strokeOpacity=".85" strokeWidth="2" />
      <Path d="M147 82v80m-81-42 81 42 85-42" stroke={white} strokeOpacity=".9" strokeWidth="2" />
      <Rect x="131" y="146" width="34" height="29" rx="4" fill={white} fillOpacity=".84" />
      <Path d="M138 154h20m-20 6h20m-20 6h13" stroke={ink} strokeWidth="2" />
    </G>
    <G {...({ className: 'hg-motion-van' } as any)}>
      <Rect x="35" y="223" width="48" height="24" rx="7" fill={ink} />
      <Path d="M83 230h18l12 12v5H83z" fill={leaf} stroke={ink} strokeWidth="2" />
      <Circle cx="53" cy="250" r="6" fill={white} stroke={ink} strokeWidth="3" />
      <Circle cx="98" cy="250" r="6" fill={white} stroke={ink} strokeWidth="3" />
    </G>
  </>;
}

function SettingsScene() {
  const teeth = Array.from({ length: 8 }, (_, i) => <Rect key={i} x="143" y="76" width="14" height="33" rx="3" fill={leaf} transform={`rotate(${i*45} 150 145)`} />);
  const teethSmall = Array.from({ length: 8 }, (_, i) => <Rect key={i} x="211" y="182" width="11" height="25" rx="3" fill={sage} transform={`rotate(${i*45} 217 236)`} />);
  return <>
    <G {...({ className: 'hg-motion-gear' } as any)}>{teeth}<Circle cx="150" cy="145" r="49" fill={sage} stroke={ink} strokeWidth="4" /><Circle cx="150" cy="145" r="18" fill={white} /><Path d="M150 160v-37m0 18c-19 0-25-11-25-22 17 0 25 7 25 22m0-5c18 0 25-12 25-23-16 0-25 8-25 23" fill={leaf} stroke={ink} strokeWidth="2" /></G>
    <G {...({ className: 'hg-motion-gear-reverse' } as any)}>{teethSmall}<Circle cx="217" cy="236" r="34" fill={white} fillOpacity=".55" stroke={ink} strokeOpacity=".6" strokeWidth="4" /><Circle cx="217" cy="236" r="12" fill={leaf} /></G>
    <G {...({ className: 'hg-motion-pop' } as any)}>
      {[0,1,2].map((i)=><G key={i}><Rect x="54" y={273+i*42} width="112" height="22" rx="11" fill={white} fillOpacity=".48" stroke={white} strokeOpacity=".75" /><Circle cx={98+i*24} cy={284+i*42} r="9" fill={leaf} stroke={white} strokeWidth="2" {...({ className: 'hg-motion-toggle' } as any)} /></G>)}
    </G>
  </>;
}

export function SagePageScene({ scene, data }: Props) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 300 440"
      fill="none"
      {...(Platform.OS === 'web'
        ? ({ 'aria-hidden': true } as any)
        : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as any))}
    >
      <Defs><ClipPath id={`tank-${scene}`}><Rect x="60" y="332" width="180" height="116" rx="32" /></ClipPath></Defs>
      {scene === 'dashboard' ? <DashboardScene scene={scene} data={data} /> : null}
      {scene === 'ai' ? <ScenePlant /> : null}
      {scene === 'inventory' ? <InventoryScene /> : null}
      {scene === 'analytics' ? <AnalyticsScene scene={scene} data={data} /> : null}
      {scene === 'market' ? <MarketScene scene={scene} data={data} /> : null}
      {scene === 'orders' ? <OrdersScene /> : null}
      {scene === 'settings' ? <SettingsScene /> : null}
    </Svg>
  );
}

