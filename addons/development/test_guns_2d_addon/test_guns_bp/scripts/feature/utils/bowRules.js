/** Pure balance rules; no server service dependency. */
export function chargeProfile(bow, ticks) {
 const ratio = Math.max(0,Math.min(1,Number(ticks)/bow.chargeTicks));
 return {ratio, full:ratio>=1, damage:bow.damage*(.25+.75*ratio*ratio),speed:.6+2.1*ratio,
  radius:bow.explosive?bow.radius*(.4+.6*ratio):0,splashDamage:bow.explosive?bow.splashDamage*(.25+.75*ratio*ratio):0};
}
export function splashDamageAt(profile,distance){return distance<=profile.radius?profile.splashDamage*Math.max(0,1-distance/profile.radius):0;}
export function chainMultiplier(previous,targetId,tick){return previous?.targetId===targetId&&tick-previous.tick<=100?1.15:1;}
export function flightStep(position,velocity){return {position:{x:position.x+velocity.x,y:position.y+velocity.y,z:position.z+velocity.z},velocity:{x:velocity.x*.99,y:velocity.y*.99-.05,z:velocity.z*.99}};}
