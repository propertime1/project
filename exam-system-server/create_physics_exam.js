const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./exam_system.db');

console.log('正在创建大学物理考试...\n');

// 创建考试
const examData = {
    title: '大学物理期中考试',
    description: '本试卷涵盖运动学、动力学、能量守恒、动量守恒、振动与波、热学等章节，共30道题目，满分300分。',
    teacher_id: 1,
    duration: 120,
    total_score: 300,
    pass_score: 180,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'PUBLISHED'
};

db.run(
    `INSERT INTO exams (title, description, teacher_id, duration, total_score, pass_score, start_time, end_time, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
        examData.title,
        examData.description,
        examData.teacher_id,
        examData.duration,
        examData.total_score,
        examData.pass_score,
        examData.start_time,
        examData.end_time,
        examData.status
    ],
    function(err) {
        if (err) {
            console.error('创建考试失败:', err.message);
            db.close();
            return;
        }

        const examId = this.lastID;
        console.log(`✅ 考试创建成功！考试ID: ${examId}`);
        console.log(`📝 考试名称: ${examData.title}`);
        console.log(`⏱️ 考试时长: ${examData.duration}分钟`);
        console.log(`📊 总分: ${examData.total_score}分，及格线: ${examData.pass_score}分\n`);

        // 查询大学物理题目
        db.all('SELECT id FROM question_bank WHERE subject = ?', ['大学物理'], (err, questions) => {
            if (err || !questions || questions.length === 0) {
                console.error('未找到大学物理题目');
                db.close();
                return;
            }

            console.log(`📚 找到 ${questions.length} 道大学物理题目，正在关联到考试...`);

            // 将题目关联到考试
            const stmt = db.prepare('INSERT INTO exam_questions (exam_id, question_id, order_num) VALUES (?, ?, ?)');
            questions.forEach((q, index) => {
                stmt.run(examId, q.id, index + 1);
            });

            stmt.finalize(() => {
                console.log(`\n✅ 题目关联完成！共关联 ${questions.length} 道题目`);
                console.log('\n========================================');
                console.log('🎉 大学物理考试创建完成！');
                console.log('========================================');
                console.log('学生现在可以登录系统参加考试了！');
                console.log('考试状态：已发布');
                console.log('========================================\n');
                db.close();
            });
        });
    }
);
