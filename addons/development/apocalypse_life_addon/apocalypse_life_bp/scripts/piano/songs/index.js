import canon from "./a7280b36.js";
import fireworks from "./ef086366.js";
import lemon from "./d9939081.js";
import baby from "./2b0eaf8e.js";
import seeYouAgain from "./8daf5d52.js";
import dystopia from "./cc821584.js";

function embedded(song) {
    return {
        id: song.id,
        name: song.name,
        duration: song.duration,
        value: async () => song,
    };
}

// 使用静态模块引用，避免部分稳定版 Script API 不支持运行时 dynamic import。
export const midis = [
    embedded(canon),
    embedded(fireworks),
    embedded(lemon),
    embedded(baby),
    embedded(seeYouAgain),
    embedded(dystopia),
];
