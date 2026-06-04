const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./exam_system.db');

console.log('开始导入大学物理题库...\n');

// 大学物理题目数据
const physicsQuestions = [
    // 第一章：运动学（5道）
    {
        type: 'SINGLE',
        content: '一个物体做匀加速直线运动，初速度为2m/s，加速度为3m/s²，则3秒后的速度为多少？',
        options: JSON.stringify(['A.8m/s', 'B.11m/s', 'C.14m/s', 'D.17m/s']),
        correct_answer: 'B',
        score: 10,
        analysis: '由速度公式 v = v₀ + at = 2 + 3×3 = 11m/s',
        subject: '大学物理',
        chapter: '运动学',
        difficulty: 2,
        tags: JSON.stringify(['匀加速直线运动', '速度公式'])
    },
    {
        type: 'SINGLE',
        content: '某质点做直线运动，其位移随时间的关系为 x = 3t² + 2t (SI单位)，则质点的加速度为多少？',
        options: JSON.stringify(['A.3m/s²', 'B.6m/s²', 'C.9m/s²', 'D.12m/s²']),
        correct_answer: 'B',
        score: 10,
        analysis: '位移 x = 3t² + 2t，速度 v = dx/dt = 6t + 2，加速度 a = dv/dt = 6m/s²',
        subject: '大学物理',
        chapter: '运动学',
        difficulty: 3,
        tags: JSON.stringify(['位移', '速度', '加速度', '微分'])
    },
    {
        type: 'TRUE_FALSE',
        content: '加速度恒定的直线运动一定是匀变速直线运动。',
        options: null,
        correct_answer: 'TRUE',
        score: 10,
        analysis: '根据定义，加速度恒定的直线运动就是匀变速直线运动。',
        subject: '大学物理',
        chapter: '运动学',
        difficulty: 1,
        tags: JSON.stringify(['加速度', '匀变速'])
    },
    {
        type: 'FILL',
        content: '一物体从静止开始做匀加速直线运动，第3秒内的位移为15m，则加速度大小为______m/s²。',
        options: null,
        correct_answer: '6',
        score: 10,
        analysis: '第3秒内的位移 = (1/2)a(3² - 2²) = (1/2)a×5 = 15，解得 a = 6m/s²',
        subject: '大学物理',
        chapter: '运动学',
        difficulty: 3,
        tags: JSON.stringify(['匀加速', '位移', '时间'])
    },
    {
        type: 'SINGLE',
        content: '关于平抛运动，下列说法正确的是？',
        options: JSON.stringify(['A.速度方向不断变化', 'B.加速度方向不断变化', 'C.速度大小保持不变', 'D.加速度大小不断变化']),
        correct_answer: 'A',
        score: 10,
        analysis: '平抛运动加速度恒定（g），但速度方向因重力作用而不断改变',
        subject: '大学物理',
        chapter: '运动学',
        difficulty: 2,
        tags: JSON.stringify(['平抛运动', '速度方向', '加速度'])
    },

    // 第二章：动力学（5道）
    {
        type: 'SINGLE',
        content: '质量为2kg的物体在水平拉力F=10N的作用下在水平地面上做匀速运动，则物体与地面间的动摩擦因数为多少？(g=10m/s²)',
        options: JSON.stringify(['A.0.2', 'B.0.5', 'C.0.8', 'D.1.0']),
        correct_answer: 'B',
        score: 10,
        analysis: '匀速运动时 F = μmg，所以 μ = F/(mg) = 10/(2×10) = 0.5',
        subject: '大学物理',
        chapter: '动力学',
        difficulty: 2,
        tags: JSON.stringify(['摩擦力', '匀速运动', '动摩擦因数'])
    },
    {
        type: 'SINGLE',
        content: '一个质量为m的物体在力F的作用下获得加速度a，若将力增大为2F，质量减半，则加速度变为原来的多少倍？',
        options: JSON.stringify(['A.2倍', 'B.3倍', 'C.4倍', 'D.8倍']),
        correct_answer: 'C',
        score: 10,
        analysis: '由 F=ma，原加速度 a₁=F/m。改变后 a₂=2F/(m/2)=4F/m=4a₁',
        subject: '大学物理',
        chapter: '动力学',
        difficulty: 2,
        tags: JSON.stringify(['牛顿第二定律', '加速度'])
    },
    {
        type: 'MULTIPLE',
        content: '关于作用力和反作用力，下列说法正确的是？',
        options: JSON.stringify(['A.它们是同种性质的力', 'B.它们大小相等方向相反', 'C.它们作用在同一个物体上', 'D.它们会相互抵消']),
        correct_answer: 'A,B',
        score: 10,
        analysis: '作用力和反作用力是同种性质的力，大小相等方向相反，但作用在不同物体上，不会抵消',
        subject: '大学物理',
        chapter: '动力学',
        difficulty: 2,
        tags: JSON.stringify(['作用力', '反作用力', '牛顿第三定律'])
    },
    {
        type: 'TRUE_FALSE',
        content: '物体所受合外力为零时，一定处于静止状态。',
        options: null,
        correct_answer: 'FALSE',
        score: 10,
        analysis: '合外力为零时物体保持原来的运动状态，可能是静止，也可能是匀速直线运动',
        subject: '大学物理',
        chapter: '动力学',
        difficulty: 1,
        tags: JSON.stringify(['合外力', '平衡状态', '惯性'])
    },
    {
        type: 'FILL',
        content: '质量为5kg的物体在力F作用下由静止开始运动，2秒后速度达到10m/s，则力F的大小为______N。',
        options: null,
        correct_answer: '25',
        score: 10,
        analysis: '由 v = at 得 a = v/t = 10/2 = 5m/s²，再由 F = ma = 5×5 = 25N',
        subject: '大学物理',
        chapter: '动力学',
        difficulty: 2,
        tags: JSON.stringify(['牛顿第二定律', '加速度'])
    },

    // 第三章：能量守恒（5道）
    {
        type: 'SINGLE',
        content: '质量为1kg的物体从高度为10m处自由下落，着地时的速度为多少？(g=10m/s²)',
        options: JSON.stringify(['A.10m/s', 'B.14m/s', 'C.20m/s', 'D.100m/s']),
        correct_answer: 'B',
        score: 10,
        analysis: '由机械能守恒：mgh = (1/2)mv²，v = √(2gh) = √(2×10×10) = 14.14m/s ≈ 14m/s',
        subject: '大学物理',
        chapter: '能量守恒',
        difficulty: 2,
        tags: JSON.stringify(['自由落体', '机械能守恒', '重力势能'])
    },
    {
        type: 'SINGLE',
        content: '一物体以10m/s的速度竖直向上抛，能达到的最大高度为多少？(g=10m/s²)',
        options: JSON.stringify(['A.5m', 'B.10m', 'C.15m', 'D.20m']),
        correct_answer: 'A',
        score: 10,
        analysis: '由机械能守恒：(1/2)mv² = mgh，h = v²/(2g) = 100/(2×10) = 5m',
        subject: '大学物理',
        chapter: '能量守恒',
        difficulty: 2,
        tags: JSON.stringify(['竖直上抛', '机械能守恒', '重力势能'])
    },
    {
        type: 'MULTIPLE',
        content: '下列过程中，机械能守恒的有？',
        options: JSON.stringify(['A.物体做自由落体运动', 'B.物体在粗糙斜面上匀速下滑', 'C.子弹射入木块的过程', 'D.抛体运动（不计空气阻力）']),
        correct_answer: 'A,D',
        score: 10,
        analysis: '只有只有重力或弹力做功时机械能才守恒。B有摩擦力，C有外力做功',
        subject: '大学物理',
        chapter: '能量守恒',
        difficulty: 3,
        tags: JSON.stringify(['机械能守恒', '重力', '弹力'])
    },
    {
        type: 'TRUE_FALSE',
        content: '只有重力对物体做功时，物体的机械能一定守恒。',
        options: null,
        correct_answer: 'TRUE',
        score: 10,
        analysis: '机械能守恒的条件是只有重力（或弹力）做功，自由落体符合条件',
        subject: '大学物理',
        chapter: '能量守恒',
        difficulty: 2,
        tags: JSON.stringify(['机械能守恒', '重力做功'])
    },
    {
        type: 'FILL',
        content: '一弹簧原长为10cm，当挂上质量为2kg的物体时，弹簧伸长5cm，则弹簧的劲度系数为______N/m。(g=10m/s²)',
        options: null,
        correct_answer: '400',
        score: 10,
        analysis: '由胡克定律 F = kx，F = mg = 20N，x = 0.05m，所以 k = F/x = 20/0.05 = 400N/m',
        subject: '大学物理',
        chapter: '能量守恒',
        difficulty: 2,
        tags: JSON.stringify(['胡克定律', '弹力', '劲度系数'])
    },

    // 第四章：动量守恒（5道）
    {
        type: 'SINGLE',
        content: '一个质量为2kg的物体以5m/s的速度做匀速直线运动，其动量大小为多少？',
        options: JSON.stringify(['A.5kg·m/s', 'B.7kg·m/s', 'C.10kg·m/s', 'D.25kg·m/s']),
        correct_answer: 'C',
        score: 10,
        analysis: '动量 p = mv = 2×5 = 10kg·m/s',
        subject: '大学物理',
        chapter: '动量守恒',
        difficulty: 1,
        tags: JSON.stringify(['动量', '质量', '速度'])
    },
    {
        type: 'SINGLE',
        content: '光滑水平面上有两个小球A和B，质量分别为m和2m，A球以速度v向右运动，与静止的B球发生弹性碰撞，碰撞后A球的速度为？',
        options: JSON.stringify(['A.v', 'B.-v/3', 'C.-v', 'D.v/3']),
        correct_answer: 'B',
        score: 10,
        analysis: '弹性碰撞公式：v₁ = (m₁-m₂)/(m₁+m₂)×v₀₁ = (m-2m)/(m+2m)×v = -v/3',
        subject: '大学物理',
        chapter: '动量守恒',
        difficulty: 3,
        tags: JSON.stringify(['弹性碰撞', '动量守恒', '碰撞公式'])
    },
    {
        type: 'MULTIPLE',
        content: '关于动量守恒定律，下列说法正确的是？',
        options: JSON.stringify(['A.系统所受合外力为零时动量守恒', 'B.系统内力不会改变系统的总动量', 'C.动量守恒时机械能一定守恒', 'D.动量是矢量']),
        correct_answer: 'A,B,D',
        score: 10,
        analysis: '动量守恒条件是合外力为零，系统内力不改变总动量，动量是矢量。但动量守恒时机械能不一定守恒（如非弹性碰撞）',
        subject: '大学物理',
        chapter: '动量守恒',
        difficulty: 2,
        tags: JSON.stringify(['动量守恒', '内力', '合外力'])
    },
    {
        type: 'TRUE_FALSE',
        content: '动量守恒定律在任何情况下都成立。',
        options: null,
        correct_answer: 'FALSE',
        score: 10,
        analysis: '动量守恒定律成立的条件是系统所受合外力为零，高于光速或微观领域需用相对论或量子力学',
        subject: '大学物理',
        chapter: '动量守恒',
        difficulty: 2,
        tags: JSON.stringify(['动量守恒条件', '适用范围'])
    },
    {
        type: 'FILL',
        content: '一个质量为3kg的物体以6m/s的速度撞向墙壁后以2m/s的速度弹回，墙壁对物体的冲量大小为______N·s。',
        options: null,
        correct_answer: '24',
        score: 10,
        analysis: '冲量 I = Δp = mv₂ - mv₁ = 3×(-2) - 3×6 = -6 - 18 = -24N·s，大小为24N·s',
        subject: '大学物理',
        chapter: '动量守恒',
        difficulty: 3,
        tags: JSON.stringify(['冲量', '动量定理', '动量变化'])
    },

    // 第五章：振动与波（5道）
    {
        type: 'SINGLE',
        content: '简谐运动的位移表达式为 x = 0.1cos(10πt) (SI单位)，则该简谐运动的周期为多少？',
        options: JSON.stringify(['A.0.1s', 'B.0.2s', 'C.0.5s', 'D.1s']),
        correct_answer: 'B',
        score: 10,
        analysis: '角频率 ω = 10π，周期 T = 2π/ω = 2π/(10π) = 0.2s',
        subject: '大学物理',
        chapter: '振动与波',
        difficulty: 2,
        tags: JSON.stringify(['简谐运动', '周期', '角频率'])
    },
    {
        type: 'SINGLE',
        content: '一列横波在某时刻的波形图如图所示，波沿+x方向传播，已知A点此刻向上运动，则波的传播方向是？',
        options: JSON.stringify(['A.向右', 'B.向左', 'C.向上', 'D.不能确定']),
        correct_answer: 'A',
        score: 10,
        analysis: '根据波形图和质点运动方向的关系：A向上运动，说明波正在向右传播',
        subject: '大学物理',
        chapter: '振动与波',
        difficulty: 2,
        tags: JSON.stringify(['横波', '波形图', '传播方向'])
    },
    {
        type: 'MULTIPLE',
        content: '关于机械波，下列说法正确的是？',
        options: JSON.stringify(['A.机械波需要介质才能传播', 'B.横波中质点振动方向与波传播方向垂直', 'C.纵波中质点振动方向与波传播方向平行', 'D.机械波不能传递能量']),
        correct_answer: 'A,B,C',
        score: 10,
        analysis: '机械波需要介质传播，能传递能量。横波振动方向垂直于传播方向，纵波振动方向平行于传播方向',
        subject: '大学物理',
        chapter: '振动与波',
        difficulty: 1,
        tags: JSON.stringify(['机械波', '横波', '纵波'])
    },
    {
        type: 'TRUE_FALSE',
        content: '声波是纵波。',
        options: null,
        correct_answer: 'TRUE',
        score: 10,
        analysis: '声波在空气中传播时，质点的振动方向与波的传播方向平行，属于纵波',
        subject: '大学物理',
        chapter: '振动与波',
        difficulty: 1,
        tags: JSON.stringify(['声波', '纵波'])
    },
    {
        type: 'FILL',
        content: '一列波的频率为100Hz，波速为400m/s，则该波的波长为______m。',
        options: null,
        correct_answer: '4',
        score: 10,
        analysis: '由波速公式 v = λf，λ = v/f = 400/100 = 4m',
        subject: '大学物理',
        chapter: '振动与波',
        difficulty: 1,
        tags: JSON.stringify(['波长', '波速', '频率'])
    },

    // 第六章：热学（5道）
    {
        type: 'SINGLE',
        content: '理想气体在等温膨胀过程中，下列物理量保持不变的是？',
        options: JSON.stringify(['A.压强', 'B.体积', 'C.温度', 'D.内能']),
        correct_answer: 'C',
        score: 10,
        analysis: '等温过程温度不变，理想气体内能只与温度有关，所以内能也不变。但压强和体积都会变化',
        subject: '大学物理',
        chapter: '热学',
        difficulty: 2,
        tags: JSON.stringify(['等温过程', '理想气体', '内能'])
    },
    {
        type: 'SINGLE',
        content: '质量为1kg的水温度从20℃升高到70℃，吸收的热量为多少？[c水=4.2×10³J/(kg·℃)]',
        options: JSON.stringify(['A.2.1×10⁵J', 'B.4.2×10⁵J', 'C.2.1×10⁶J', 'D.4.2×10⁶J']),
        correct_answer: 'A',
        score: 10,
        analysis: 'Q = cmΔt = 4.2×10³×1×(70-20) = 4.2×10³×50 = 2.1×10⁵J',
        subject: '大学物理',
        chapter: '热学',
        difficulty: 1,
        tags: JSON.stringify(['热量', '比热容', '温度变化'])
    },
    {
        type: 'MULTIPLE',
        content: '关于热力学第一定律，下列说法正确的是？',
        options: JSON.stringify(['A.ΔU = Q + W', 'B.气体对外做功时W为负值', 'C.物体吸热时Q为正值', 'D.该定律是能量守恒定律在热学中的应用']),
        correct_answer: 'A,C,D',
        score: 10,
        analysis: '热力学第一定律 ΔU = Q + W，吸热 Q>0，对外做功 W<0，公式体现了能量守恒',
        subject: '大学物理',
        chapter: '热学',
        difficulty: 2,
        tags: JSON.stringify(['热力学第一定律', '热量', '功', '内能'])
    },
    {
        type: 'TRUE_FALSE',
        content: '热量可以从低温物体传递到高温物体。',
        options: null,
        correct_answer: 'TRUE',
        score: 10,
        analysis: '热量可以自发从高温物体传向低温物体，但不可能自发地从低温传向高温。外界做功时可以实现',
        subject: '大学物理',
        chapter: '热学',
        difficulty: 2,
        tags: JSON.stringify(['热传递', '热力学第二定律'])
    },
    {
        type: 'FILL',
        content: '一定量的理想气体在等压过程中，体积从10L增加到20L，温度从300K增加到______K。',
        options: null,
        correct_answer: '600',
        score: 10,
        analysis: '等压过程 V/T = 常数，V₁/T₁ = V₂/T₂，10/300 = 20/T₂，T₂ = 600K',
        subject: '大学物理',
        chapter: '热学',
        difficulty: 2,
        tags: JSON.stringify(['等压过程', '查理定律'])
    }
];

console.log(`准备导入 ${physicsQuestions.length} 道大学物理题目...\n`);

// 插入题目
const stmt = db.prepare(`
    INSERT INTO question_bank (type, content, options, correct_answer, score, analysis, subject, chapter, difficulty, tags, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let successCount = 0;
physicsQuestions.forEach((q, index) => {
    stmt.run(
        q.type,
        q.content,
        q.options,
        q.correct_answer,
        q.score,
        q.analysis,
        q.subject,
        q.chapter,
        q.difficulty,
        q.tags,
        1,
        function(err) {
            if (err) {
                console.error(`第 ${index + 1} 题导入失败:`, err.message);
            } else {
                successCount++;
                if ((index + 1) % 5 === 0) {
                    console.log(`已导入 ${index + 1}/${physicsQuestions.length} 道题目...`);
                }
            }
        }
    );
});

stmt.finalize(() => {
    // 查询结果
    db.get('SELECT COUNT(*) as count FROM question_bank WHERE subject = ?', ['大学物理'], (err, row) => {
        if (err) {
            console.error('查询失败:', err);
        } else {
            console.log('\n========================================');
            console.log('✅ 大学物理题库导入完成！');
            console.log('========================================');
            console.log(`📊 成功导入 ${row.count} 道题目`);
            console.log('\n题目分布：');
            console.log('- 运动学：5道');
            console.log('- 动力学：5道');
            console.log('- 能量守恒：5道');
            console.log('- 动量守恒：5道');
            console.log('- 振动与波：5道');
            console.log('- 热学：5道');
            console.log('========================================\n');
        }
        db.close();
        process.exit(0);
    });
});
