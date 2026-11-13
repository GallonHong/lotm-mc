/** Vanilla arrows are the only ammunition; bows are not automatic firearms. */
export const BOWS = Object.freeze({
 'test_gun:hunter_compound_bow': Object.freeze({id:'test_gun:hunter_compound_bow',name:'猎人复合弓',rarity:'rare',chargeTicks:24,damage:20,penetration:.15,durability:1000}),
 'test_gun:carbon_spider_bow': Object.freeze({id:'test_gun:carbon_spider_bow',name:'碳素蛛弓',rarity:'epic',chargeTicks:28,damage:30,penetration:.20,durability:1400,explosive:true,splashDamage:15,radius:3})
});
export const getBow = id => BOWS[id];
