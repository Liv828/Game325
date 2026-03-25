// game-core.js

// ---------- 游戏常量 ----------
const PLAYER_COUNT = 6;
const COLORS = ["红","橙","黄","绿","青","蓝","紫","粉","棕","灰"];
const NUMBERS = [1,2,3,4,5,6,7,8,9];
const CAPACITIES = [2,3,3];
const ROUNDS = 3;
const ROUND_DRAW = [4,4,3];
const ROUND_PICK = [3,3,2];
const TYPE_STRENGTH = {
    "高牌": 0, "对子": 1, "顺子": 2, "三条": 3, "同色": 4, "同花顺": 5
};

// ---------- Card 类 ----------
class Card {
    constructor(color, number) {
        this.color = color;
        this.number = number;
    }
    clone() { return new Card(this.color, this.number); }
    toString() { return `${this.color}${this.number}`; }
}

// ---------- 辅助函数 ----------
function getColorBg(color) {
    const map = {
        "红": "#ffcccc", "橙": "#ffe0cc", "黄": "#ffffcc", "绿": "#ccffcc",
        "青": "#ccffff", "蓝": "#ccccff", "紫": "#e0ccff", "粉": "#ffccff",
        "棕": "#e0ccb3", "灰": "#e0e0e0"
    };
    return map[color] || "#ffffff";
}

// ---------- 牌型评估 ----------
function evaluateRow(cards) {  ///每一行单独评分
    if (cards.length === 0) return { type: "高牌", score: 0, details: {} };
    const n = cards.length;
    const numbers = cards.map(c => c.number);
    const colors = cards.map(c => c.color);
    const sortedNums = [...numbers].sort((a,b)=>a-b);

    if (n === 2) {
        if (cards[0].number === cards[1].number) {
            const pairValue = cards[0].number;
            const score = pairValue;
            return { type: "对子", score: score, details: { pairValue, third: null } };
        }
        return { type: "高牌", score: 0, details: {} };
    } else if (n === 3) {
        // 同花顺
        if (new Set(colors).size === 1 && sortedNums[2] - sortedNums[0] === 2 && new Set(numbers).size === 3)
            return { type: "同花顺", score: 10, details: { maxNum: sortedNums[2] } };
        // 同色
        else if (new Set(colors).size === 1)
            return { type: "同色", score: 7, details: { maxNum: sortedNums[2] } };
        // 三条
        else if (new Set(numbers).size === 1)
            return { type: "三条", score: 5, details: { tripleValue: numbers[0] } };
        // 顺子
        else if (sortedNums[1] === sortedNums[0]+1 && sortedNums[2] === sortedNums[1]+1)
            return { type: "顺子", score: 3, details: { maxNum: sortedNums[2] } };
        // 对子
        const count = {};
        numbers.forEach(n => count[n] = (count[n]||0)+1);
        for (let [num, cnt] of Object.entries(count)) {
            if (cnt === 2) {
                const other = numbers.find(n => n != num);
                return { type: "对子", score: 2 , details: { pairValue: parseInt(num), third: other } };
            }
        }
        return { type: "高牌", score: 0, details: { maxNum: sortedNums[2] } };
    }
    return { type: "高牌", score: 0 };
}

function compareRows(rowA, rowB) {  //两行对比，防止爆牌
    const evalA = evaluateRow(rowA);
    const evalB = evaluateRow(rowB);
    if (TYPE_STRENGTH[evalA.type] !== TYPE_STRENGTH[evalB.type]) {
        return TYPE_STRENGTH[evalA.type] - TYPE_STRENGTH[evalB.type];
    }
    if (evalA.type === "对子") {
        if (evalA.details.pairValue !== evalB.details.pairValue)
            return evalA.details.pairValue - evalB.details.pairValue;
        const thirdA = evalA.details.third || 0;
        const thirdB = evalB.details.third || 0;
        return thirdA - thirdB;
    } else {
        const maxA = evalA.details.maxNum || (rowA.length ? Math.max(...rowA.map(c=>c.number)) : 0);
        const maxB = evalB.details.maxNum || (rowB.length ? Math.max(...rowB.map(c=>c.number)) : 0);
        return maxA - maxB;
    }
}

function isBusted(rows) {  //爆了吗
    if (rows[0].length === 0 || rows[1].length === 0 || rows[2].length === 0) return false;
    const cmp1 = compareRows(rows[0], rows[1]);
    const cmp2 = compareRows(rows[1], rows[2]);
    return cmp1 > 0 || cmp2 > 0;
}

function getSpecialBonus(rows) {  //特殊牌型
    const allCards = rows.flat();
    if (allCards.length !== 8) return 0;
    const nums = allCards.map(c => c.number);
    const colors = allCards.map(c => c.color);
    const sortedNums = [...nums].sort((a,b)=>a-b);
    const isSeq = (sortedNums[0] === 1 && sortedNums[7] === 8) || (sortedNums[0] === 2 && sortedNums[7] === 9);
    let dragon = false;
    if (isSeq && new Set(nums).size === 8) 
        if (isSeq && new Set(nums).size === 8) {
        // 新增：检查每一行是否递增
        if (rows.every(row => isRowIncreasing(row))) {
            dragon = true;
        }
    };
    const count = {};
    nums.forEach(n => count[n] = (count[n]||0)+1);
    const allPairs = Object.values(count).every(v => v%2 === 0);
    const row0 = rows[0]; const row1 = rows[1]; const row2 = rows[2];
    const isRow0Seq = row0.length===2 && Math.abs(row0[0].number - row0[1].number) === 1;
    const isRow1Seq = row1.length===3 && (()=>{let n=row1.map(c=>c.number).sort((a,b)=>a-b); return n[1]===n[0]+1 && n[2]===n[1]+1;})();
    const isRow2Seq = row2.length===3 && (()=>{let n=row2.map(c=>c.number).sort((a,b)=>a-b); return n[1]===n[0]+1 && n[2]===n[1]+1;})();
    const threeSnakes = isRow0Seq && isRow1Seq && isRow2Seq;
    const allColorsDiff = new Set(colors).size === 8;
    const allColorsSame = new Set(colors).size === 1;
    const allOdd = nums.every(n => n%2===1);
    const allEven = nums.every(n => n%2===0);
    const oddEven = allOdd || allEven;
    const eachRowSameColor = rows.every(row => new Set(row.map(c => c.color)).size === 1);
    //6条
    const colorCount = {};
    colors.forEach(c => colorCount[c] = (colorCount[c]||0)+1);
    const hasSixColor = Object.values(colorCount).some(v => v >= 6);
    const hasSixNumber = Object.values(count).some(v => v >= 6);
    const hasSix = hasSixNumber || hasSixColor;
    //八尊
    const hasEightNumber = Object.values(count).some(v => v === 8);
    const colorEight = allColorsSame; // 八张颜色相同
    const hasEight = hasEightNumber || colorEight;
    // 新增：每一行内颜色互不相同（无重复）
    const eachRowColorsDistinct = rows.every(row => new Set(row.map(c => c.color)).size === row.length);
    
    let best = 0;
    if (dragon && allColorsSame) best = 90; //金龙，龙+所有颜色都一样
    else if (dragon && eachRowColorsDistinct) best = 35; //异龙，龙+每行颜色都不一样
    else if (dragon && eachRowSameColor ) best = 35; //青龙，龙+:每一行颜色一样的龙
    else if (hasEight) best = 35; //八尊-35分:有八张一样的
    else if (hasSix) best = 25; //六条-25分:有六张一样的
    else if (dragon) best = 15; //龙，所有牌连续
    else if (threeSnakes) best = 10; //三蛇，三行都是顺子
    else if (allPairs) best = 10; //四个对子或以上
    else if (allColorsDiff) best = 10; //异色
    else if (oddEven) best = 10; //全单双
    return best;
}


function isRowIncreasing(row) {
    if (row.length === 2) {
        return row[0].number < row[1].number;
    } else if (row.length === 3) {
        return row[0].number < row[1].number && row[1].number < row[2].number;
    }
    return true; // 空行或异常情况，实际不会发生
}
//一柱擎天！！！
function tedutedu(rows) {
    // 提取每行中的数字集合
    const rowSets = rows.map(row => new Set(row.map(c => c.number)));
    // 找出三行共有的数字（第一行数字集合与第二行、第三行的交集）
    const commonNumbers = [...rowSets[0]].filter(num => rowSets[1].has(num) && rowSets[2].has(num));
    return commonNumbers.length > 0;
}

function calculatePlayerScore(rows) {
    if (isBusted(rows)) return 0;
    let baseScore = 0;
    for (let i=0; i<3; i++) {
        const eval = evaluateRow(rows[i]);
        baseScore += eval.score;
    }
    const special = getSpecialBonus(rows);
    let total = Math.max(baseScore, special)
    if (tedutedu(rows)) {
        total += 5;
    }
    return total;
}
