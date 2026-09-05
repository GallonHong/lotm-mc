# Apocalypse Life Addon（末日生活系统）

本 Addon 由原 `apocalypse_vehicles_addon` 原位升级而来，整合载具、食品、饮品、医疗用品、自动售货机和可演奏钢琴。行为包与资源包 UUID 保持不变，旧世界升级后不会因改名丢失原有载具。

v1.4.0 增加两种只能从 SAPI“生活与载具商”购买的实体设施：联盟医疗站（12,000 金币，消耗绷带或急救包治疗）与枪械训练靶（5,000 金币，以悬浮文字显示单次伤害和最近 5 秒 DPS）。两种设施都没有合成配方；未安装 SAPI 时 Life Addon 仍可独立加载。

## 钢琴

- 物品：`xypiano:piano_item`，占用相邻两格放置，破坏任意一半只返还一架钢琴。
- 交互：右键打开稳定版演奏菜单，支持 12 个半音、1～7 八度、长/标准/短三种音色、音名旋律输入。
- 曲库：保留上传包的 6 首内置 MIDI 曲目，并提供播放、暂停、继续和停止。
- 获取：没有工作台、切石机或熔炉配方，只能在 SAPI 全球商店以 20,000 金币购买。
- 兼容：未引入原包测试版 DDUI 依赖，继续使用 `@minecraft/server-ui 1.3.0`；原始上传包（作者标识 `XiaoYangx666`）保存在 `addons/reference/钢琴_原始包_v1.3.0.mcaddon`。

---

## 1. 核心载具清单 (第一阶段 5 款精选车型)

| 载具名称 | 实体 Identifier | 钥匙/生成蛋 | 座位数 | 特殊机制 / 生存战术定位 |
| :--- | :--- | :--- | :---: | :--- |
| **末日皮卡 (Truck)** | `ab_ve:truck` | `ab_ve:truck_spawner` | **2座** | **拾荒运货核心**：后备箱支持升级至 27 格大容量，双人武装乘车自由射击 |
| **越野摩托车 (Motorcycle)** | `ab_ve:motorcycle` | `ab_ve:motorcycle_spawner` | 1座 | **单兵极速突围**：车身轻巧穿行小巷，跳跃键触发抬前轮 (Wheely) 爆发加速 |
| **战地救护车 (Ambulance)** | `ab_ve:ambulance` | `ab_ve:ambulance_spawner` | 2座 | **移动战地医院**：跳跃触发群体回血光环 (Regeneration)，带警灯警笛 |
| **冲锋快艇 (Speedboat)** | `ab_ve:speedboat` | `ab_ve:speedboat_spawner` | 2座 | **水域巡逻突击**：水面高速冲刺，跨河/跨海登陆作战 |
| **军用直升机 (Helicopter)** | `ab_ve:helicopter` | `ab_ve:helicopter_spawner` | **2座** | **立体空中机动**：仰角爬升、俯角下降、平视悬停；副驾 360° 开火压制 |

---

## 2. 车辆蓝图与工业半成品配件

v1.2.0 起，摩托车与冲锋快艇蓝图仍可由玩家合成；皮卡、救护车和军用直升机蓝图取消工作台配方，改由 SAPI 载具商以 25,000 / 40,000 / 80,000 金币出售。

### 2.1 车辆制造蓝图 (Blueprints)
- `survival_vehicle:blueprint_truck`（皮卡制造蓝图）
- `survival_vehicle:blueprint_motorcycle`（摩托车制造蓝图）
- `survival_vehicle:blueprint_ambulance`（战地救护车制造蓝图）
- `survival_vehicle:blueprint_speedboat`（冲锋快艇制造蓝图）
- `survival_vehicle:blueprint_helicopter`（军用直升机蓝图 - 高级稀有）

### 2.2 工业半成品配件 (Parts)
- `survival_vehicle:scrap_metal` (废钢板 / 加固钣金)
- `survival_vehicle:vehicle_tire` (橡胶轮胎)
- `survival_vehicle:vehicle_chassis` (车辆钢制底盘)
- `survival_vehicle:vehicle_engine` (内燃机引擎)
- `survival_vehicle:vehicle_battery` (车载铅酸蓄电池)
- `survival_vehicle:heli_rotor` (航空主旋翼组)
- `survival_vehicle:heli_tail_rotor` (航空尾翼平衡桨)
- `survival_vehicle:boat_propeller` (船用推进螺旋桨)
- `survival_vehicle:medical_box_module` (战地医疗单元)

---

## 3. 动态燃油系统 (Fuel System)

1. **道具**：
   - `survival_vehicle:jerrycan_full` (满装汽油桶，提供 100% 燃油)
   - `survival_vehicle:jerrycan_empty` (空汽油桶，可在工作台灌装重填)
2. **加油方式**：手持满装汽油桶右键点击车辆，播放加油声效，燃油注满，返还空油桶。
3. **驾驶 HUD 状态**：
   - 驾驶时在 Action Bar 实时呈现动态进度条与时速：
     `§e⛽ [████████░░] 80% §7| ⚡ 时速: §b42 km/h`
4. **耗尽保护**：
   - 燃油归 0 时车辆熄火停驶；
   - **直升机在没油时自动开启缓降 (Slow Falling)**，平稳着陆，防止摔死。

---

## 4. SAPI 经济改装工坊 (Wrench Upgrade UI)

- 手持 `ab_ve:wrench` (机械改装扳手) 右键点击车辆，唤出改装 UI；
- 直接扣除 `sapi_server_addon` 的 **`money` 计分板金币**；
- 余额不足时友好提示并拒绝升级；
- 改装等级与颜色涂装在车辆被击碎后，**会自动序列化保存进掉落钥匙的 Lore 中**，重新放车属性完全继承！

---

## 5. 编译与打包

在当前目录下直接运行：
```bash
bash addons/development/apocalypse_life_addon/build.sh
```
会自动生成：
- `Apocalypse_Life_BP.mcpack`
- `Apocalypse_Life_RP.mcpack`
- `Apocalypse_Life_Addon.mcaddon`
