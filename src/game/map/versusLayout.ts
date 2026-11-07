// 雙人地圖（建築物）嘅出生點
// 已用地圖掃描驗證過（座標係遊戲內座標，唔係 GLB 原始座標）：
// 房主：正門前院空地（地板高度 0，四周 ≥1.5 米空位）
export const VERSUS_HOST_SPAWN: [number, number, number] = [-2.5, 1.5, 10]
// 加入者：建築物最北面嘅露天平台（地板高度 1.4，四周 ≥3.9 米空位）
export const VERSUS_JOIN_SPAWN: [number, number, number] = [1.5, 2.9, -11]
