const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../exam-system-complete.html'));
});

// 初始化数据库
const db = new sqlite3.Database('./exam_system.db');

// 开启外键支持
db.run('PRAGMA foreign_keys = ON');

// 创建所有必要的表
db.serialize(() => {
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'STUDENT',
    grade TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'ACTIVE',
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 试卷表
  db.run(`CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    teacher_id INTEGER NOT NULL,
    duration INTEGER DEFAULT 60,
    total_score INTEGER DEFAULT 100,
    pass_score INTEGER DEFAULT 60,
    start_time DATETIME,
    end_time DATETIME,
    status TEXT DEFAULT 'DRAFT',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
  )`);

  // 题库表（独立，不依赖考试）
  db.run(`CREATE TABLE IF NOT EXISTS question_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    options TEXT,
    correct_answer TEXT,
    score INTEGER DEFAULT 10,
    analysis TEXT,
    subject TEXT,
    chapter TEXT,
    difficulty INTEGER DEFAULT 3,
    tags TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // 考试-题目关联表（原 questions 表重命名概念）
  db.run(`CREATE TABLE IF NOT EXISTS exam_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    order_num INTEGER DEFAULT 0,
    score_override INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE,
    UNIQUE(exam_id, question_id)
  )`);

  // 考试记录表
  db.run(`CREATE TABLE IF NOT EXISTS exam_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    answers TEXT,
    score INTEGER,
    status TEXT DEFAULT 'PENDING',
    start_time DATETIME,
    submit_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
  )`);

  // 成绩表
  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    ai_analysis TEXT,
    study_suggestions TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
  )`);

  // 错题本表
  db.run(`CREATE TABLE IF NOT EXISTS wrong_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    exam_id INTEGER,
    student_answer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (question_id) REFERENCES question_bank(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id)
  )`);
  
  // 添加唯一约束（如果不存在）
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_wrong_questions_unique ON wrong_questions(student_id, question_id)`);

  // 人工阅卷记录表
  db.run(`CREATE TABLE IF NOT EXISTS manual_grading (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    feedback TEXT,
    graded_by INTEGER,
    graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (question_id) REFERENCES question_bank(id),
    FOREIGN KEY (graded_by) REFERENCES users(id)
  )`);

  // AI对话记录表
  db.run(`CREATE TABLE IF NOT EXISTS ai_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // 学习资料表
  db.run(`CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'ARTICLE',
    subject TEXT,
    difficulty TEXT DEFAULT 'MEDIUM',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // 任务表
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    grade TEXT NOT NULL,
    exam_id INTEGER,
    created_by INTEGER NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    status TEXT DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`);

  // 任务完成记录表
  db.run(`CREATE TABLE IF NOT EXISTS task_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT DEFAULT 'PENDING',
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (student_id) REFERENCES users(id),
    UNIQUE(task_id, student_id)
  )`);

  // 消息表
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'NOTICE',
    target_type TEXT DEFAULT 'ALL',
    target_id INTEGER,
    sender_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id)
  )`);

  // 个人动态表
  db.run(`CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    related_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  console.log('数据库表初始化完成');

  // 创建索引以优化查询性能
  db.run(`CREATE INDEX IF NOT EXISTS idx_exam_records_exam_student ON exam_records(exam_id, student_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_exam_records_status ON exam_records(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_scores_exam_student ON scores(exam_id, student_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wrong_questions_student ON wrong_questions(student_id)`);

  // ============ 插入示例数据 ============
  insertSampleData();
});

// ============ 示例数据插入 ============
async function insertSampleData() {
  // 检查是否已有示例数据
  db.get('SELECT COUNT(*) as cnt FROM users', async (err, row) => {
    if (err) {
      console.error('检查示例数据失败:', err);
      return;
    }
    if (row && row.cnt > 0) {
      console.log('示例数据已存在，跳过插入');
      return;
    }

    console.log('开始插入示例数据...');

    // 插入教师账号
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    db.run(
      'INSERT INTO users (username, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      ['teacher', 'teacher@example.com', teacherPassword, '张老师', 'TEACHER'],
      (err) => {
        if (err) console.error('插入教师账号失败:', err);
        else console.log('教师账号创建成功: teacher / teacher123');
      }
    );

    // 插入学生账号
    const studentPassword = await bcrypt.hash('student123', 10);
    db.run(
      'INSERT INTO users (username, email, password, name, role, grade) VALUES (?, ?, ?, ?, ?, ?)',
      ['student', 'student@example.com', studentPassword, '李同学', 'STUDENT', '2024级'],
      (err) => {
        if (err) console.error('插入学生账号失败:', err);
        else console.log('学生账号创建成功: student / student123');
      }
    );

    // 插入示例任务
    const sampleTasks = [
      { title: '完成高等数学第三章练习题', description: '完成课本第120-135页的所有练习题，包括选择题和填空题。', grade: '2024级' },
      { title: '背诵英语单词表Unit 5', description: '熟练掌握Unit 5中的所有新单词，能够听懂、会说、会写。', grade: '2024级' },
      { title: '完成程序设计实验报告', description: '撰写并提交"数组与排序算法"实验的完整实验报告。', grade: '2024级' },
      { title: '复习线性代数知识点', description: '复习矩阵运算、行列式、向量空间等相关知识点，准备期中考试。', grade: '2024级' },
      { title: '完成英语听力训练', description: '完成Unit 4的听力练习，并在平台上提交成绩。', grade: '2024级' }
    ];

    const taskStmt = db.prepare('INSERT INTO tasks (title, description, grade, created_by, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    sampleTasks.forEach(task => {
      const startTime = new Date(Date.now() - 86400000);
      const endTime = new Date(Date.now() + 7 * 86400000);
      taskStmt.run(task.title, task.description, task.grade, 1, startTime, endTime, 'ACTIVE');
    });
    taskStmt.finalize(() => console.log('示例任务插入完成'));

    // 插入示例消息
    const sampleMessages = [
      { title: '欢迎使用一心智考系统', content: '欢迎加入一心智考！开始您的学习之旅吧。', type: 'SYSTEM', target_type: 'ALL' },
      { title: '考试通知', content: '高等数学期末考试将于6月15日上午9点在教学楼A301举行，请提前做好准备。', type: 'NOTICE', target_type: 'USER', target_id: 2 },
      { title: '成绩发布', content: '您参加的"程序设计基础期末考试"成绩已发布，得分128/150分，恭喜取得优异成绩！', type: 'SYSTEM', target_type: 'USER', target_id: 2 }
    ];

    const msgStmt = db.prepare('INSERT INTO messages (title, content, type, target_type, target_id, sender_id, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)');
    sampleMessages.forEach(msg => {
      msgStmt.run(msg.title, msg.content, msg.type, msg.target_type, msg.target_id || null, 1, msg.target_type === 'USER' ? 0 : 1);
    });
    msgStmt.finalize(() => console.log('示例消息插入完成'));

    // 插入示例题目
    const sampleQuestions = [
      // ===== 高等数学（5道题）=====
      {
        type: 'SINGLE', content: '函数 f(x) = x^2 在 x = 2 处的导数值为：',
        options: JSON.stringify(['A.2', 'B.3', 'C.4', 'D.8']),
        correct_answer: 'C', score: 10, analysis: 'f\'(x) = 2x，当x=2时，f\'(2) = 4。',
        subject: '高等数学', chapter: '导数与微分', difficulty: 2, tags: JSON.stringify(['导数', '基本求导'])
      },
      {
        type: 'MULTIPLE', content: '以下哪些函数在区间 (0, +∞) 上是单调递增的？',
        options: JSON.stringify(['A.y = e^x', 'B.y = ln(x)', 'C.y = x^2', 'D.y = 1/x']),
        correct_answer: 'A,B,C', score: 10, analysis: 'e^x 导数为正，ln(x) 导数 1/x > 0，x^2 导数 2x > 0（x>0），1/x 导数 -1/x^2 < 0。',
        subject: '高等数学', chapter: '函数的性质', difficulty: 3, tags: JSON.stringify(['单调性', '导数应用'])
      },
      {
        type: 'TRUE_FALSE', content: '连续函数一定可导。',
        options: null, correct_answer: 'FALSE', score: 10,
        analysis: '反例：f(x) = |x| 在 x=0 处连续但不可导。',
        subject: '高等数学', chapter: '连续与可导', difficulty: 3, tags: JSON.stringify(['连续', '可导', '反例'])
      },
      {
        type: 'FILL', content: '不定积分 ∫2x dx = ______（不含任意常数C）。',
        options: null, correct_answer: 'x^2', score: 10,
        analysis: '∫2x dx = x^2 + C，不含常数即为 x^2。',
        subject: '高等数学', chapter: '不定积分', difficulty: 1, tags: JSON.stringify(['积分', '基本积分公式'])
      },
      {
        type: 'SINGLE', content: '设函数 f(x) = sin(x)，则 f\'\'(x) = ？',
        options: JSON.stringify(['A.sin(x)', 'B.-sin(x)', 'C.cos(x)', 'D.-cos(x)']),
        correct_answer: 'B', score: 10, analysis: 'f\'(x) = cos(x)，f\'\'(x) = -sin(x)。',
        subject: '高等数学', chapter: '高阶导数', difficulty: 2, tags: JSON.stringify(['二阶导数', '三角函数'])
      },

      // ===== 大学英语（5道题）=====
      {
        type: 'SINGLE', content: 'Choose the correct word: She has been working here _____ 2010.',
        options: JSON.stringify(['A.for', 'B.since', 'C.from', 'D.during']),
        correct_answer: 'B', score: 10, analysis: '"since" 用于具体时间点（2010年），"for" 用于时间段。',
        subject: '大学英语', chapter: '时态与介词', difficulty: 2, tags: JSON.stringify(['介词', '现在完成时'])
      },
      {
        type: 'MULTIPLE', content: 'Which of the following sentences are grammatically correct?',
        options: JSON.stringify([
          'A.He don\'t like coffee.',
          'B.She has been to Paris twice.',
          'C.They are going to visit the museum.',
          'D.I am agree with you.'
        ]),
        correct_answer: 'B,C', score: 10, analysis: 'A应为doesn\'t，D中agree是动词不需要be动词。B和C语法正确。',
        subject: '大学英语', chapter: '语法基础', difficulty: 3, tags: JSON.stringify(['语法', '时态', '主谓一致'])
      },
      {
        type: 'TRUE_FALSE', content: '"I look forward to hear from you" is grammatically correct.',
        options: null, correct_answer: 'FALSE', score: 10,
        analysis: '"look forward to" 中的 "to" 是介词，后面应接动名词(ing形式)，正确为 "look forward to hearing"。',
        subject: '大学英语', chapter: '动词短语', difficulty: 3, tags: JSON.stringify(['动词短语', '动名词'])
      },
      {
        type: 'FILL', content: 'Fill in the blank: If I _____ (study) harder, I would have passed the exam. (用正确的动词形式)',
        options: null, correct_answer: 'had studied', score: 10,
        analysis: '这是虚拟语气第三条件句（与过去事实相反），if从句用过去完成时 had + 过去分词。',
        subject: '大学英语', chapter: '虚拟语气', difficulty: 4, tags: JSON.stringify(['虚拟语气', '过去完成时'])
      },
      {
        type: 'SINGLE', content: 'What does the prefix "un-" in "unhappy" mean?',
        options: JSON.stringify(['A.again', 'B.not', 'C.very', 'D.before']),
        correct_answer: 'B', score: 10, analysis: '前缀 "un-" 表示否定，意为 "not"，如 unhappy = not happy。',
        subject: '大学英语', chapter: '词汇与构词法', difficulty: 1, tags: JSON.stringify(['前缀', '词汇'])
      },

      // ===== 程序设计基础（5道题）=====
      {
        type: 'SINGLE', content: '在大多数编程语言中，数组的索引通常从哪个数字开始？',
        options: JSON.stringify(['A.1', 'B.0', 'C.-1', 'D.取决于数组长度']),
        correct_answer: 'B', score: 10, analysis: '在C、Java、Python、JavaScript等主流语言中，数组索引从0开始。',
        subject: '程序设计基础', chapter: '数组与数据结构', difficulty: 1, tags: JSON.stringify(['数组', '索引'])
      },
      {
        type: 'MULTIPLE', content: '以下哪些是常见的排序算法？',
        options: JSON.stringify(['A.冒泡排序', 'B.二分查找', 'C.快速排序', 'D.深度优先搜索']),
        correct_answer: 'A,C', score: 10, analysis: '冒泡排序和快速排序是排序算法。二分查找是搜索算法，深度优先搜索是图遍历算法。',
        subject: '程序设计基础', chapter: '算法基础', difficulty: 2, tags: JSON.stringify(['排序', '算法'])
      },
      {
        type: 'TRUE_FALSE', content: '在面向对象编程中，一个子类可以继承多个父类的特性，这称为多重继承。Java支持多重继承。',
        options: null, correct_answer: 'FALSE', score: 10,
        analysis: 'Java不支持类的多重继承（一个类只能继承一个父类），但支持接口的多重实现。C++支持多重继承。',
        subject: '程序设计基础', chapter: '面向对象编程', difficulty: 3, tags: JSON.stringify(['继承', 'OOP', 'Java'])
      },
      {
        type: 'FILL', content: '在JavaScript中，用于将字符串转换为整数的方法是 ______。',
        options: null, correct_answer: 'parseInt', score: 10,
        analysis: 'parseInt() 函数解析字符串参数并返回一个指定基数的整数。例如 parseInt("123") 返回 123。',
        subject: '程序设计基础', chapter: 'JavaScript基础', difficulty: 1, tags: JSON.stringify(['JavaScript', '类型转换'])
      },
      {
        type: 'SINGLE', content: '时间复杂度 O(n log n) 通常对应以下哪种算法？',
        options: JSON.stringify(['A.线性查找', 'B.冒泡排序', 'C.归并排序', 'D.选择排序']),
        correct_answer: 'C', score: 10, analysis: '归并排序和快速排序的平均时间复杂度为 O(n log n)。线性查找 O(n)，冒泡和选择排序 O(n^2)。',
        subject: '程序设计基础', chapter: '算法复杂度', difficulty: 4, tags: JSON.stringify(['时间复杂度', '排序算法'])
      }
    ];

    // 插入示例题目
    const stmt = db.prepare(
      `INSERT INTO question_bank (type, content, options, correct_answer, score, analysis, subject, chapter, difficulty, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    sampleQuestions.forEach(q => {
      stmt.run(q.type, q.content, q.options, q.correct_answer, q.score, q.analysis, q.subject, q.chapter, q.difficulty, q.tags, 1);
    });

    stmt.finalize(() => {
      console.log('示例题目插入完成（15道）');

      // 插入示例考试
      db.run(
        `INSERT INTO exams (title, description, teacher_id, duration, total_score, pass_score, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          '程序设计基础期末考试',
          '本试卷涵盖数组、算法、面向对象、JavaScript基础等核心知识点，共15道题，满分150分。',
          1, 120, 150, 90,
          '2026-06-01 09:00:00', '2026-06-01 11:00:00', 'PUBLISHED'
        ],
        function(err) {
          if (err) {
            console.error('插入示例考试失败:', err);
            return;
          }
          const examId = this.lastID;
          console.log('示例考试插入完成，ID:', examId);

          // 将程序设计基础的5道题加入考试
          db.all('SELECT id FROM question_bank WHERE subject = ?', ['程序设计基础'], (err, questions) => {
            if (err) {
              console.error('查询题目失败:', err);
              return;
            }

            const eqStmt = db.prepare(
              'INSERT OR IGNORE INTO exam_questions (exam_id, question_id, order_num) VALUES (?, ?, ?)'
            );
            questions.forEach((q, idx) => {
              eqStmt.run(examId, q.id, idx + 1);
            });
            eqStmt.finalize(() => {
              console.log('考试题目关联完成');
            });
          });
        }
      );

      // 插入更多示例考试
      // 高等数学考试
      db.run(
        `INSERT INTO exams (title, description, teacher_id, duration, total_score, pass_score, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          '高等数学期末考试',
          '本试卷涵盖函数、极限、导数、积分等核心知识点，共5道题。',
          1, 90, 100, 60,
          new Date(Date.now() + 86400000).toISOString(),
          new Date(Date.now() + 7 * 86400000).toISOString(),
          'PUBLISHED'
        ],
        function(err) {
          if (err) console.error('插入高等数学考试失败:', err);
          else {
            const examId = this.lastID;
            // 将高等数学的题目加入考试
            db.all('SELECT id FROM question_bank WHERE subject = ?', ['高等数学'], (err, questions) => {
              if (err || !questions) return;
              const eqStmt = db.prepare('INSERT OR IGNORE INTO exam_questions (exam_id, question_id, order_num) VALUES (?, ?, ?)');
              questions.forEach((q, idx) => eqStmt.run(examId, q.id, idx + 1));
              eqStmt.finalize();
            });
          }
        }
      );

      // 大学英语考试
      db.run(
        `INSERT INTO exams (title, description, teacher_id, duration, total_score, pass_score, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          '大学英语期中考试',
          '本试卷涵盖词汇、语法、阅读理解等知识点，共5道题。',
          1, 60, 100, 60,
          new Date(Date.now() + 172800000).toISOString(),
          new Date(Date.now() + 14 * 86400000).toISOString(),
          'PUBLISHED'
        ],
        function(err) {
          if (err) console.error('插入大学英语考试失败:', err);
          else {
            const examId = this.lastID;
            db.all('SELECT id FROM question_bank WHERE subject = ?', ['大学英语'], (err, questions) => {
              if (err || !questions) return;
              const eqStmt = db.prepare('INSERT OR IGNORE INTO exam_questions (exam_id, question_id, order_num) VALUES (?, ?, ?)');
              questions.forEach((q, idx) => eqStmt.run(examId, q.id, idx + 1));
              eqStmt.finalize();
            });
          }
        }
      );
    });
  });
}

// ============ 认证相关接口 ============

// 注册接口
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, name, role, grade } = req.body;

  if (!username || !email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: '请填写所有必填字段'
    });
  }

  // 学生必须选择年级
  if ((!role || role === 'STUDENT') && !grade) {
    return res.status(400).json({
      success: false,
      message: '请选择年级'
    });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器错误' });
    }
    if (row) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: '服务器错误' });
      }
      if (row) {
        return res.status(400).json({ success: false, message: '邮箱已被注册' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userRole = role || 'STUDENT';
      const userGrade = userRole === 'STUDENT' ? grade : null;

      db.run(
        'INSERT INTO users (username, email, password, name, role, grade) VALUES (?, ?, ?, ?, ?, ?)',
        [username, email, hashedPassword, name, userRole, userGrade],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: '注册失败：' + err.message });
          }

          // 自动创建欢迎消息
          db.run(
            'INSERT INTO messages (title, content, type, target_id, target_type) VALUES (?, ?, ?, ?, ?)',
            ['欢迎加入一心智考', '欢迎您加入我们的平台！开始您的学习之旅吧。', 'SYSTEM', this.lastID, 'USER'],
            (msgErr) => {
              if (msgErr) console.error('创建欢迎消息失败:', msgErr);
            }
          );

          res.json({
            success: true,
            message: '注册成功',
            data: { id: this.lastID, username, email, name, role: userRole, grade: userGrade }
          });
        }
      );
    });
  });
});

// 登录接口
app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '请输入用户名和密码' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器错误' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    db.run('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        status: user.status
      }
    });
  });
});

// ============ 题库管理接口 ============

// 获取题库列表（支持筛选和分页）
app.get('/api/questions', (req, res) => {
  const { subject, type, difficulty, keyword, page = 1, pageSize = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (subject) {
    whereClause += ' AND qb.subject = ?';
    params.push(subject);
  }
  if (type) {
    whereClause += ' AND qb.type = ?';
    params.push(type);
  }
  if (difficulty) {
    whereClause += ' AND qb.difficulty = ?';
    params.push(parseInt(difficulty));
  }
  if (keyword) {
    whereClause += ' AND (qb.content LIKE ? OR qb.tags LIKE ? OR qb.chapter LIKE ?)';
    const kw = '%' + keyword + '%';
    params.push(kw, kw, kw);
  }

  // 查询总数
  db.get(`SELECT COUNT(*) as total FROM question_bank qb ${whereClause}`, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }

    // 查询分页数据
    const sql = `
      SELECT qb.*, u.name as creator_name
      FROM question_bank qb
      LEFT JOIN users u ON qb.created_by = u.id
      ${whereClause}
      ORDER BY qb.created_at DESC
      LIMIT ? OFFSET ?
    `;
    db.all(sql, [...params, parseInt(pageSize), offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: '查询失败' });
      }

      // 解析 options 和 tags 字段
      const parsedRows = rows.map(row => {
        try {
          if (row.options) row.options = JSON.parse(row.options);
        } catch (e) { /* ignore */ }
        try {
          if (row.tags) row.tags = JSON.parse(row.tags);
        } catch (e) { /* ignore */ }
        return row;
      });

      res.json({
        success: true,
        data: {
          list: parsedRows,
          pagination: {
            total: countRow.total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(countRow.total / parseInt(pageSize))
          }
        }
      });
    });
  });
});

// 创建题目
app.post('/api/questions', (req, res) => {
  const { type, content, options, correct_answer, score, analysis, subject, chapter, difficulty, tags, created_by } = req.body;

  if (!type || !content || !correct_answer) {
    return res.status(400).json({ success: false, message: '题目类型、内容和正确答案为必填项' });
  }

  db.run(
    `INSERT INTO question_bank (type, content, options, correct_answer, score, analysis, subject, chapter, difficulty, tags, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      type, content,
      options ? JSON.stringify(options) : null,
      correct_answer,
      score || 10,
      analysis || null,
      subject || null,
      chapter || null,
      difficulty || 3,
      tags ? JSON.stringify(tags) : null,
      created_by || null
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '创建题目失败：' + err.message });
      }
      res.json({ success: true, message: '题目创建成功', data: { id: this.lastID } });
    }
  );
});

// 更新题目
app.put('/api/questions/:id', (req, res) => {
  const questionId = req.params.id;
  const { type, content, options, correct_answer, score, analysis, subject, chapter, difficulty, tags } = req.body;

  db.get('SELECT * FROM question_bank WHERE id = ?', [questionId], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }

    db.run(
      `UPDATE question_bank SET
        type = ?, content = ?, options = ?, correct_answer = ?, score = ?,
        analysis = ?, subject = ?, chapter = ?, difficulty = ?, tags = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        type || row.type,
        content || row.content,
        options ? JSON.stringify(options) : row.options,
        correct_answer || row.correct_answer,
        score !== undefined ? score : row.score,
        analysis !== undefined ? analysis : row.analysis,
        subject !== undefined ? subject : row.subject,
        chapter !== undefined ? chapter : row.chapter,
        difficulty !== undefined ? difficulty : row.difficulty,
        tags ? JSON.stringify(tags) : row.tags,
        questionId
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '更新题目失败：' + err.message });
        }
        res.json({ success: true, message: '题目更新成功' });
      }
    );
  });
});

// 删除题目
app.delete('/api/questions/:id', (req, res) => {
  const questionId = req.params.id;

  db.run('DELETE FROM question_bank WHERE id = ?', [questionId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '删除题目失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }
    res.json({ success: true, message: '题目删除成功' });
  });
});

// 批量导入题目
app.post('/api/questions/batch', (req, res) => {
  const { questions, created_by } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, message: '请提供题目数组' });
  }

  const stmt = db.prepare(
    `INSERT INTO question_bank (type, content, options, correct_answer, score, analysis, subject, chapter, difficulty, tags, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let successCount = 0;
  let failCount = 0;

  questions.forEach(q => {
    stmt.run(
      q.type, q.content,
      q.options ? JSON.stringify(q.options) : null,
      q.correct_answer,
      q.score || 10,
      q.analysis || null,
      q.subject || null,
      q.chapter || null,
      q.difficulty || 3,
      q.tags ? JSON.stringify(q.tags) : null,
      created_by || null
    );
    successCount++;
  });

  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: '批量导入失败：' + err.message });
    }
    res.json({
      success: true,
      message: `批量导入完成`,
      data: { success_count: successCount, fail_count: failCount, total: questions.length }
    });
  });
});

// 获取所有科目列表
app.get('/api/questions/subjects', (req, res) => {
  db.all(
    'SELECT subject, COUNT(*) as question_count FROM question_bank WHERE subject IS NOT NULL GROUP BY subject ORDER BY question_count DESC',
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: '查询失败' });
      }
      res.json({ success: true, data: rows });
    }
  );
});

// ============ 考试管理接口 ============

// 创建考试（教师）
app.post('/api/exams', (req, res) => {
  const { title, description, teacher_id, duration, total_score, pass_score, start_time, end_time } = req.body;

  db.run(
    `INSERT INTO exams (title, description, teacher_id, duration, total_score, pass_score, start_time, end_time, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, teacher_id, duration, total_score, pass_score, start_time, end_time, 'DRAFT'],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '创建考试失败' });
      }
      res.json({ success: true, message: '考试创建成功', data: { id: this.lastID } });
    }
  );
});

// 获取考试列表
app.get('/api/exams', (req, res) => {
  const { role, user_id } = req.query;

  let sql = `
    SELECT e.*, u.name as teacher_name,
    (SELECT COUNT(*) FROM exam_questions WHERE exam_id = e.id) as question_count
    FROM exams e
    LEFT JOIN users u ON e.teacher_id = u.id
    WHERE e.status = 'PUBLISHED'
  `;

  if (role === 'TEACHER' && user_id) {
    sql = `
      SELECT e.*, u.name as teacher_name,
      (SELECT COUNT(*) FROM exam_questions WHERE exam_id = e.id) as question_count
      FROM exams e
      LEFT JOIN users u ON e.teacher_id = u.id
      WHERE e.teacher_id = ${user_id}
    `;
  }

  sql += ' ORDER BY e.created_at DESC';

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// 获取考试详情
app.get('/api/exams/:id', (req, res) => {
  const examId = req.params.id;

  db.get('SELECT * FROM exams WHERE id = ?', [examId], (err, exam) => {
    if (err || !exam) {
      return res.status(404).json({ success: false, message: '考试不存在' });
    }

    // 通过关联表获取题目
    const sql = `
      SELECT qb.*, eq.order_num, eq.score_override
      FROM exam_questions eq
      JOIN question_bank qb ON eq.question_id = qb.id
      WHERE eq.exam_id = ?
      ORDER BY eq.order_num
    `;
    db.all(sql, [examId], (err, questions) => {
      if (err) {
        return res.status(500).json({ success: false, message: '查询题目失败' });
      }

      // 解析 options 和 tags
      const parsedQuestions = questions.map(q => {
        try {
          if (q.options) q.options = JSON.parse(q.options);
        } catch (e) { /* ignore */ }
        try {
          if (q.tags) q.tags = JSON.parse(q.tags);
        } catch (e) { /* ignore */ }
        return q;
      });

      res.json({
        success: true,
        data: { ...exam, questions: parsedQuestions }
      });
    });
  });
});

// 更新考试信息
app.put('/api/exams/:id', (req, res) => {
  const examId = req.params.id;
  const { title, description, duration, total_score, pass_score, start_time, end_time } = req.body;

  db.get('SELECT * FROM exams WHERE id = ?', [examId], (err, exam) => {
    if (err || !exam) {
      return res.status(404).json({ success: false, message: '考试不存在' });
    }

    db.run(
      `UPDATE exams SET
        title = ?, description = ?, duration = ?, total_score = ?,
        pass_score = ?, start_time = ?, end_time = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title || exam.title,
        description !== undefined ? description : exam.description,
        duration !== undefined ? duration : exam.duration,
        total_score !== undefined ? total_score : exam.total_score,
        pass_score !== undefined ? pass_score : exam.pass_score,
        start_time !== undefined ? start_time : exam.start_time,
        end_time !== undefined ? end_time : exam.end_time,
        examId
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '更新考试失败：' + err.message });
        }
        res.json({ success: true, message: '考试更新成功' });
      }
    );
  });
});

// 删除考试
app.delete('/api/exams/:id', (req, res) => {
  const examId = req.params.id;

  db.get('SELECT * FROM exams WHERE id = ?', [examId], (err, exam) => {
    if (err || !exam) {
      return res.status(404).json({ success: false, message: '考试不存在' });
    }

    if (exam.status === 'PUBLISHED') {
      return res.status(400).json({ success: false, message: '已发布的考试不能删除，请先撤销发布' });
    }

    db.run('DELETE FROM exams WHERE id = ?', [examId], function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '删除考试失败' });
      }
      res.json({ success: true, message: '考试删除成功' });
    });
  });
});

// 发布考试
app.put('/api/exams/:id/publish', (req, res) => {
  const examId = req.params.id;

  db.get('SELECT * FROM exams WHERE id = ?', [examId], (err, exam) => {
    if (err || !exam) {
      return res.status(404).json({ success: false, message: '考试不存在' });
    }

    // 检查是否已有关联题目
    db.get('SELECT COUNT(*) as cnt FROM exam_questions WHERE exam_id = ?', [examId], (err, countRow) => {
      if (err) {
        return res.status(500).json({ success: false, message: '查询失败' });
      }
      if (!countRow || countRow.cnt === 0) {
        return res.status(400).json({ success: false, message: '考试没有关联题目，无法发布' });
      }

      db.run(
        "UPDATE exams SET status = 'PUBLISHED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [examId],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: '发布考试失败' });
          }
          res.json({ success: true, message: '考试已发布' });
        }
      );
    });
  });
});

// 撤销考试
app.put('/api/exams/:id/unpublish', (req, res) => {
  const examId = req.params.id;

  db.get('SELECT * FROM exams WHERE id = ?', [examId], (err, exam) => {
    if (err || !exam) {
      return res.status(404).json({ success: false, message: '考试不存在' });
    }

    db.run(
      "UPDATE exams SET status = 'DRAFT', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [examId],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '撤销考试失败' });
        }
        res.json({ success: true, message: '考试已撤销发布' });
      }
    );
  });
});

// 智能组卷（根据条件从题库自动选题）
app.post('/api/exams/:id/compose', (req, res) => {
  const examId = req.params.id;
  const { subject, difficulty, type, count, score_per_question } = req.body;

  db.get('SELECT * FROM exams WHERE id = ?', [examId], (err, exam) => {
    if (err || !exam) {
      return res.status(404).json({ success: false, message: '考试不存在' });
    }

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (subject) {
      whereClause += ' AND subject = ?';
      params.push(subject);
    }
    if (difficulty) {
      if (Array.isArray(difficulty)) {
        const placeholders = difficulty.map(() => '?').join(',');
        whereClause += ` AND difficulty IN (${placeholders})`;
        params.push(...difficulty);
      } else {
        whereClause += ' AND difficulty = ?';
        params.push(parseInt(difficulty));
      }
    }
    if (type) {
      if (Array.isArray(type)) {
        const placeholders = type.map(() => '?').join(',');
        whereClause += ` AND type IN (${placeholders})`;
        params.push(...type);
      } else {
        whereClause += ' AND type = ?';
        params.push(type);
      }
    }

    // 排除已加入该考试的题目
    whereClause += ' AND id NOT IN (SELECT question_id FROM exam_questions WHERE exam_id = ?)';
    params.push(examId);

    const limitCount = Math.min(parseInt(count) || 10, 100);

    const sql = `SELECT * FROM question_bank ${whereClause} ORDER BY RANDOM() LIMIT ?`;

    db.all(sql, [...params, limitCount], (err, questions) => {
      if (err) {
        return res.status(500).json({ success: false, message: '选题失败' });
      }

      if (questions.length === 0) {
        return res.status(400).json({ success: false, message: '没有符合条件的题目可供选择' });
      }

      // 批量插入关联
      const stmt = db.prepare(
        'INSERT OR IGNORE INTO exam_questions (exam_id, question_id, order_num, score_override) VALUES (?, ?, ?, ?)'
      );

      // 获取当前最大序号
      db.get('SELECT MAX(order_num) as max_order FROM exam_questions WHERE exam_id = ?', [examId], (err, orderRow) => {
        if (err) {
          return res.status(500).json({ success: false, message: '查询失败' });
        }

        let startOrder = (orderRow && orderRow.max_order) ? orderRow.max_order + 1 : 1;

        questions.forEach((q, idx) => {
          stmt.run(examId, q.id, startOrder + idx, score_per_question || null);
        });

        stmt.finalize((err) => {
          if (err) {
            return res.status(500).json({ success: false, message: '组卷失败' });
          }

          // 更新考试总分
          db.get(
            `SELECT COALESCE(SUM(COALESCE(eq.score_override, qb.score)), 0) as total
             FROM exam_questions eq
             JOIN question_bank qb ON eq.question_id = qb.id
             WHERE eq.exam_id = ?`,
            [examId],
            (err, row) => {
              if (!err && row) {
                db.run('UPDATE exams SET total_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [row.total, examId]);
              }

              res.json({
                success: true,
                message: `智能组卷成功，已添加 ${questions.length} 道题目`,
                data: {
                  added_count: questions.length,
                  question_ids: questions.map(q => q.id)
                }
              });
            }
          );
        });
      });
    });
  });
});

// 批量添加题目到考试
app.post('/api/exams/:id/questions/batch', (req, res) => {
  const examId = req.params.id;
  const { question_ids, score_overrides } = req.body;

  if (!Array.isArray(question_ids) || question_ids.length === 0) {
    return res.status(400).json({ success: false, message: '请提供题目ID数组' });
  }

  db.get('SELECT * FROM exams WHERE id = ?', [examId], (err, exam) => {
    if (err || !exam) {
      return res.status(404).json({ success: false, message: '考试不存在' });
    }

    // 获取当前最大序号
    db.get('SELECT MAX(order_num) as max_order FROM exam_questions WHERE exam_id = ?', [examId], (err, orderRow) => {
      if (err) {
        return res.status(500).json({ success: false, message: '查询失败' });
      }

      let startOrder = (orderRow && orderRow.max_order) ? orderRow.max_order + 1 : 1;

      const stmt = db.prepare(
        'INSERT OR IGNORE INTO exam_questions (exam_id, question_id, order_num, score_override) VALUES (?, ?, ?, ?)'
      );

      let addedCount = 0;
      question_ids.forEach((qid, idx) => {
        const scoreOverride = (score_overrides && score_overrides[idx] !== undefined) ? score_overrides[idx] : null;
        stmt.run(examId, qid, startOrder + idx, scoreOverride);
        addedCount++;
      });

      stmt.finalize((err) => {
        if (err) {
          return res.status(500).json({ success: false, message: '批量添加失败' });
        }

        // 更新考试总分
        db.get(
          `SELECT COALESCE(SUM(COALESCE(eq.score_override, qb.score)), 0) as total
           FROM exam_questions eq
           JOIN question_bank qb ON eq.question_id = qb.id
           WHERE eq.exam_id = ?`,
          [examId],
          (err, row) => {
            if (!err && row) {
              db.run('UPDATE exams SET total_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [row.total, examId]);
            }
          }
        );

        res.json({
          success: true,
          message: `批量添加完成`,
          data: { added_count: addedCount }
        });
      });
    });
  });
});

// 添加题目到考试（单个）
app.post('/api/exams/:id/questions', (req, res) => {
  const examId = req.params.id;
  const { question_id, order_num, score_override } = req.body;

  if (!question_id) {
    return res.status(400).json({ success: false, message: '请提供题目ID' });
  }

  db.get('SELECT * FROM exams WHERE id = ?', [examId], (err, exam) => {
    if (err || !exam) {
      return res.status(404).json({ success: false, message: '考试不存在' });
    }

    // 获取最大序号
    db.get('SELECT MAX(order_num) as max_order FROM exam_questions WHERE exam_id = ?', [examId], (err, orderRow) => {
      const nextOrder = order_num || ((orderRow && orderRow.max_order) ? orderRow.max_order + 1 : 1);

      db.run(
        'INSERT OR IGNORE INTO exam_questions (exam_id, question_id, order_num, score_override) VALUES (?, ?, ?, ?)',
        [examId, question_id, nextOrder, score_override || null],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: '添加题目失败' });
          }
          res.json({ success: true, message: '题目添加成功', data: { id: this.lastID } });
        }
      );
    });
  });
});

// ============ 考试记录接口 ============

// 开始考试
app.post('/api/exams/:id/start', (req, res) => {
  const examId = req.params.id;
  const { student_id } = req.body;

  // 先检查是否已有进行中的考试记录
  db.get(
    `SELECT id FROM exam_records WHERE exam_id = ? AND student_id = ? AND status = 'IN_PROGRESS'`,
    [examId, student_id],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ success: false, message: '检查考试状态失败' });
      }
      
      if (existing) {
        // 已有进行中的考试，直接返回成功
        return res.json({ success: true, message: '继续考试', data: { record_id: existing.id } });
      }
      
      // 检查是否已提交过
      db.get(
        `SELECT id, status FROM exam_records WHERE exam_id = ? AND student_id = ? ORDER BY created_at DESC LIMIT 1`,
        [examId, student_id],
        (err, record) => {
          if (err) {
            return res.status(500).json({ success: false, message: '检查考试状态失败' });
          }
          
          if (record && record.status === 'SUBMITTED') {
            // 允许重新考试：删除旧记录并创建新记录
            console.log(`学生 ${student_id} 重新参加考试 ${examId}，清理旧记录`);
            
            // 删除旧的考试记录、成绩和错题
            db.run('DELETE FROM exam_records WHERE exam_id = ? AND student_id = ?', [examId, student_id]);
            db.run('DELETE FROM scores WHERE exam_id = ? AND student_id = ?', [examId, student_id]);
            // 注意：不清理错题本，保留错题供复习
          }
          
          // 创建新的考试记录（如果是重新考试，record 变量已存在但会被忽略）
          db.run(
            `INSERT INTO exam_records (exam_id, student_id, start_time, status) VALUES (?, ?, datetime('now'), 'IN_PROGRESS')`,
            [examId, student_id],
            function(err) {
              if (err) {
                return res.status(500).json({ success: false, message: '开始考试失败' });
              }
              res.json({ success: true, message: record && record.status === 'SUBMITTED' ? '重新开始考试' : '考试开始', data: { record_id: this.lastID } });
            }
          );
        }
      );
    }
  );
});

// 提交答案
app.post('/api/exams/:id/submit', (req, res) => {
  const examId = parseInt(req.params.id);
  const { student_id, answers } = req.body;

  console.log('提交考试:', { examId, student_id, answers });

  // 通过关联表获取题目
  const sql = `
    SELECT qb.*, eq.score_override
    FROM exam_questions eq
    JOIN question_bank qb ON eq.question_id = qb.id
    WHERE eq.exam_id = ?
    ORDER BY eq.order_num
  `;

  db.all(sql, [examId], (err, questions) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询题目失败' });
    }

    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    const wrongQuestionIds = [];

    questions.forEach(q => {
      const questionScore = q.score_override || q.score;
      const studentAnswer = answers[q.id];
      const correctAnswer = q.correct_answer;
      
      // 智能评分逻辑
      let isCorrect = false;
      
      if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
        // 未作答，判错
        isCorrect = false;
      } else if (q.type === 'FILL' || q.type === 'fill') {
        // 填空题：忽略大小写和前后空格，支持多个正确答案（用|分隔）
        const studentNormalized = String(studentAnswer).trim().toLowerCase();
        const correctAnswers = String(correctAnswer).split('|').map(a => a.trim().toLowerCase());
        isCorrect = correctAnswers.includes(studentNormalized);
      } else if (q.type === 'MULTIPLE' || q.type === 'multiple') {
        // 多选题：答案排序后比较
        const studentSorted = String(studentAnswer).split(',').sort().join(',');
        const correctSorted = String(correctAnswer).split(',').sort().join(',');
        isCorrect = studentSorted === correctSorted;
      } else {
        // 单选题、判断题：精确匹配
        isCorrect = String(studentAnswer).trim() === String(correctAnswer).trim();
      }
      
      if (isCorrect) {
        totalScore += questionScore;
        correctCount++;
      } else {
        wrongCount++;
        wrongQuestionIds.push(q.id);
      }
    });

    // 更新考试记录
    db.run(
      `UPDATE exam_records SET answers = ?, score = ?, status = 'SUBMITTED', submit_time = datetime('now')
       WHERE exam_id = ? AND student_id = ? AND status = 'IN_PROGRESS'`,
      [JSON.stringify(answers), totalScore, examId, student_id],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '提交失败' });
        }

        if (this.changes === 0) {
          console.log('更新失败: 没有找到匹配的记录', { examId, student_id });
          return res.status(400).json({ success: false, message: '没有找到进行中的考试记录' });
        }

        // 保存成绩
        db.run(
          `INSERT INTO scores (exam_id, student_id, score, correct_count, wrong_count) VALUES (?, ?, ?, ?, ?)`,
          [examId, student_id, totalScore, correctCount, wrongCount],
          function(err) {
            if (err) {
              console.error('保存成绩失败:', err);
            }
          }
        );

        // 自动添加错题到错题本
        console.log('准备添加错题到错题本:', {
          student_id,
          examId,
          wrongQuestionIds,
          wrongCount: wrongQuestionIds.length
        });
        
        if (wrongQuestionIds.length > 0) {
          const wqStmt = db.prepare(
            'INSERT OR IGNORE INTO wrong_questions (student_id, question_id, exam_id, student_answer) VALUES (?, ?, ?, ?)'
          );
          
          let addedCount = 0;
          let skippedCount = 0;
          
          wrongQuestionIds.forEach(qid => {
            const result = wqStmt.run(student_id, qid, examId, answers[qid] || '');
            if (result.changes > 0) {
              addedCount++;
              console.log(`✓ 添加错题 ${qid} 成功`);
            } else {
              skippedCount++;
              console.log(`- 错题 ${qid} 已存在，跳过`);
            }
          });
          
          wqStmt.finalize();
          
          console.log(`错题本更新完成：新增 ${addedCount} 条，跳过 ${skippedCount} 条`);
        } else {
          console.log('无错题需要添加');
        }

        res.json({
          success: true,
          message: '提交成功',
          data: { 
            score: totalScore, 
            correct_count: correctCount, 
            wrong_count: wrongCount,
            answers: answers  // 返回用户答案以便前端显示
          }
        });
      }
    );
  });
});

// 获取需要人工阅卷的题目列表（教师用）
app.get('/api/exams/:id/grading-list', (req, res) => {
  const examId = req.params.id;
  
  const sql = `
    SELECT er.id as record_id, er.student_id, er.answers, er.score,
           u.name as student_name, u.username as student_username,
           qb.id as question_id, qb.content as question_content, qb.type as question_type,
           qb.correct_answer, qb.analysis, eq.score_override as question_score
    FROM exam_records er
    JOIN users u ON er.student_id = u.id
    JOIN exam_questions eq ON eq.exam_id = er.exam_id
    JOIN question_bank qb ON eq.question_id = qb.id
    LEFT JOIN manual_grading mg ON mg.exam_id = er.exam_id 
      AND mg.student_id = er.student_id 
      AND mg.question_id = qb.id
    WHERE er.exam_id = ? 
      AND er.status = 'SUBMITTED'
      AND (qb.type = 'ESSAY' OR qb.type = 'essay')
      AND mg.id IS NULL
    ORDER BY er.submit_time DESC, eq.order_num
  `;
  
  db.all(sql, [examId], (err, rows) => {
    if (err) {
      console.error('查询阅卷列表失败:', err);
      return res.status(500).json({ success: false, message: '查询失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// 提交人工阅卷结果（教师用）
app.post('/api/exams/:id/grade', (req, res) => {
  const examId = req.params.id;
  const { student_id, question_id, score, feedback, graded_by } = req.body;
  
  if (!student_id || !question_id || score === undefined) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  // 保存阅卷记录
  db.run(
    `INSERT INTO manual_grading (exam_id, student_id, question_id, score, feedback, graded_by) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [examId, student_id, question_id, score, feedback || '', graded_by],
    function(err) {
      if (err) {
        console.error('保存阅卷记录失败:', err);
        return res.status(500).json({ success: false, message: '保存失败' });
      }
      
      // 更新考试记录的总分
      db.get(
        `SELECT SUM(score) as total_manual_score 
         FROM manual_grading 
         WHERE exam_id = ? AND student_id = ?`,
        [examId, student_id],
        (err, row) => {
          if (err) {
            console.error('查询人工阅卷总分失败:', err);
          } else {
            // 更新考试记录的分数
            db.get(
              `SELECT score FROM exam_records WHERE exam_id = ? AND student_id = ?`,
              [examId, student_id],
              (err, record) => {
                if (!err && record) {
                  const newScore = (record.score || 0) + score;
                  db.run(
                    `UPDATE exam_records SET score = ? WHERE exam_id = ? AND student_id = ?`,
                    [newScore, examId, student_id]
                  );
                }
              }
            );
          }
        }
      );
      
      res.json({ success: true, message: '阅卷完成', data: { grading_id: this.lastID } });
    }
  );
});

// 获取某考试的所有提交记录（教师用）
app.get('/api/exams/:id/records', (req, res) => {
  const examId = req.params.id;

  const sql = `
    SELECT er.*, u.name as student_name, u.username as student_username
    FROM exam_records er
    JOIN users u ON er.student_id = u.id
    WHERE er.exam_id = ?
    ORDER BY er.submit_time DESC
  `;

  db.all(sql, [examId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// 保存答题进度（自动保存）
app.post('/api/exams/:id/save-progress', (req, res) => {
  const examId = req.params.id;
  const { student_id, answers } = req.body;

  // 查找进行中的记录
  db.get(
    'SELECT * FROM exam_records WHERE exam_id = ? AND student_id = ? AND status = ?',
    [examId, student_id, 'IN_PROGRESS'],
    (err, record) => {
      if (err) {
        return res.status(500).json({ success: false, message: '查询失败' });
      }

      if (record) {
        // 更新现有记录
        db.run(
          'UPDATE exam_records SET answers = ? WHERE id = ?',
          [JSON.stringify(answers), record.id],
          function(err) {
            if (err) {
              return res.status(500).json({ success: false, message: '保存进度失败' });
            }
            res.json({ success: true, message: '进度已保存', data: { record_id: record.id } });
          }
        );
      } else {
        // 创建新记录
        db.run(
          `INSERT INTO exam_records (exam_id, student_id, answers, start_time, status)
           VALUES (?, ?, ?, datetime('now'), 'IN_PROGRESS')`,
          [examId, student_id, JSON.stringify(answers)],
          function(err) {
            if (err) {
              return res.status(500).json({ success: false, message: '保存进度失败' });
            }
            res.json({ success: true, message: '进度已保存', data: { record_id: this.lastID } });
          }
        );
      }
    }
  );
});

// 获取学生自己的考试记录
app.get('/api/exams/:id/my-record', (req, res) => {
  const examId = req.params.id;
  const { student_id } = req.query;

  if (!student_id) {
    return res.status(400).json({ success: false, message: '请提供学生ID' });
  }

  db.get(
    'SELECT * FROM exam_records WHERE exam_id = ? AND student_id = ? ORDER BY created_at DESC LIMIT 1',
    [examId, student_id],
    (err, record) => {
      if (err) {
        return res.status(500).json({ success: false, message: '查询失败' });
      }
      if (!record) {
        return res.json({ success: true, data: null });
      }

      // 解析 answers
      try {
        if (record.answers) record.answers = JSON.parse(record.answers);
      } catch (e) { /* ignore */ }

      res.json({ success: true, data: record });
    }
  );
});

// ============ 成绩相关接口 ============

// 获取学生成绩列表
app.get('/api/scores', (req, res) => {
  const { student_id, exam_id } = req.query;

  let sql = `
    SELECT s.*, e.title as exam_title, e.total_score, u.name as student_name
    FROM scores s
    JOIN exams e ON s.exam_id = e.id
    JOIN users u ON s.student_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (student_id) {
    sql += ' AND s.student_id = ?';
    params.push(student_id);
  }
  if (exam_id) {
    sql += ' AND s.exam_id = ?';
    params.push(exam_id);
  }

  sql += ' ORDER BY s.submitted_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// 获取学生个人在某次考试中的排名
app.get('/api/scores/rank', (req, res) => {
  const { student_id, exam_id } = req.query;
  
  if (!student_id || !exam_id) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  // 获取该学生的成绩
  db.get(
    `SELECT s.*, u.name as student_name 
     FROM scores s 
     JOIN users u ON s.student_id = u.id
     WHERE s.student_id = ? AND s.exam_id = ?`,
    [student_id, exam_id],
    (err, studentScore) => {
      if (err) {
        return res.status(500).json({ success: false, message: '查询失败' });
      }
      
      if (!studentScore) {
        return res.status(404).json({ success: false, message: '未找到成绩记录' });
      }
      
      // 获取该考试的所有成绩并计算排名
      db.all(
        `SELECT score FROM scores WHERE exam_id = ? ORDER BY score DESC`,
        [exam_id],
        (err, allScores) => {
          if (err) {
            return res.status(500).json({ success: false, message: '查询失败' });
          }
          
          const scores = allScores.map(s => s.score);
          const totalStudents = scores.length;
          
          // 计算排名（同分同名次）
          let rank = 1;
          let previousScore = null;
          for (let i = 0; i < scores.length; i++) {
            if (previousScore !== null && scores[i] < previousScore) {
              rank = i + 1;
            }
            if (scores[i] === studentScore.score) {
              break;
            }
            previousScore = scores[i];
          }
          
          // 计算百分位
          const percentile = totalStudents > 0 
            ? Math.round((1 - (rank - 1) / totalStudents) * 100) 
            : 0;
          
          res.json({
            success: true,
            data: {
              ...studentScore,
              rank: rank,
              total_students: totalStudents,
              percentile: percentile,
              top_percent: Math.round((rank / totalStudents) * 100)
            }
          });
        }
      );
    }
  );
});

// 获取某考试所有学生成绩（教师用）
app.get('/api/scores/exam/:exam_id', (req, res) => {
  const examId = req.params.exam_id;

  const sql = `
    SELECT s.*, u.name as student_name, u.username as student_username
    FROM scores s
    JOIN users u ON s.student_id = u.id
    WHERE s.exam_id = ?
    ORDER BY s.score DESC
  `;

  db.all(sql, [examId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }

    // 添加排名信息
    let currentRank = 1;
    let previousScore = null;
    const rankedRows = rows.map((row, index) => {
      // 同分同名次处理
      if (previousScore !== null && row.score < previousScore) {
        currentRank = index + 1;
      }
      previousScore = row.score;
      return {
        ...row,
        rank: currentRank
      };
    });

    // 计算统计数据
    const scores = rows.map(r => r.score);
    const stats = {
      total_students: rows.length,
      average_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      highest_score: scores.length > 0 ? Math.max(...scores) : 0,
      lowest_score: scores.length > 0 ? Math.min(...scores) : 0,
      pass_count: scores.filter(s => s >= 60).length,
      fail_count: scores.filter(s => s < 60).length
    };

    res.json({
      success: true,
      data: {
        scores: rankedRows,
        statistics: stats
      }
    });
  });
});

// 获取某次成绩的详细答题记录（含每题对错和解析）
app.get('/api/scores/detail/:id', (req, res) => {
  const scoreId = req.params.id;

  db.get('SELECT * FROM scores WHERE id = ?', [scoreId], (err, score) => {
    if (err || !score) {
      return res.status(404).json({ success: false, message: '成绩记录不存在' });
    }

    // 获取考试记录（含答案）
    db.get(
      'SELECT * FROM exam_records WHERE exam_id = ? AND student_id = ? ORDER BY created_at DESC LIMIT 1',
      [score.exam_id, score.student_id],
      (err, record) => {
        if (err) {
          return res.status(500).json({ success: false, message: '查询考试记录失败' });
        }

        // 获取考试题目
        const sql = `
          SELECT qb.*, eq.score_override, eq.order_num
          FROM exam_questions eq
          JOIN question_bank qb ON eq.question_id = qb.id
          WHERE eq.exam_id = ?
          ORDER BY eq.order_num
        `;

        db.all(sql, [score.exam_id], (err, questions) => {
          if (err) {
            return res.status(500).json({ success: false, message: '查询题目失败' });
          }

          let studentAnswers = {};
          if (record && record.answers) {
            try {
              studentAnswers = JSON.parse(record.answers);
            } catch (e) { /* ignore */ }
          }

          // 构建详细答题记录
          const detailQuestions = questions.map(q => {
            const questionScore = q.score_override || q.score;
            const studentAnswer = studentAnswers[q.id] || null;
            const isCorrect = studentAnswer === q.correct_answer;

            // 解析 options
            let parsedOptions = q.options;
            try {
              if (parsedOptions) parsedOptions = JSON.parse(parsedOptions);
            } catch (e) { /* ignore */ }

            return {
              question_id: q.id,
              type: q.type,
              content: q.content,
              options: parsedOptions,
              correct_answer: q.correct_answer,
              student_answer: studentAnswer,
              is_correct: isCorrect,
              score: questionScore,
              earned_score: isCorrect ? questionScore : 0,
              analysis: q.analysis,
              subject: q.subject,
              chapter: q.chapter,
              difficulty: q.difficulty
            };
          });

          // 获取学生信息
          db.get('SELECT name, username FROM users WHERE id = ?', [score.student_id], (err, student) => {
            // 获取考试信息
            db.get('SELECT title, total_score, pass_score FROM exams WHERE id = ?', [score.exam_id], (err, exam) => {
              res.json({
                success: true,
                data: {
                  score_info: {
                    ...score,
                    student_name: student ? student.name : '',
                    exam_title: exam ? exam.title : ''
                  },
                  questions: detailQuestions,
                  correct_count: detailQuestions.filter(q => q.is_correct).length,
                  wrong_count: detailQuestions.filter(q => !q.is_correct).length
                }
              });
            });
          });
        });
      }
    );
  });
});

// 获取成绩统计（学生个人）
app.get('/api/scores/statistics', (req, res) => {
  const { student_id } = req.query;

  db.all('SELECT * FROM scores WHERE student_id = ? ORDER BY submitted_at', [student_id], (err, scores) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }

    const totalExams = scores.length;
    const averageScore = totalExams > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / totalExams : 0;
    const highestScore = totalExams > 0 ? Math.max(...scores.map(s => s.score)) : 0;
    const lowestScore = totalExams > 0 ? Math.min(...scores.map(s => s.score)) : 0;

    res.json({
      success: true,
      data: {
        total_exams: totalExams,
        average_score: Math.round(averageScore),
        highest_score: highestScore,
        lowest_score: lowestScore,
        scores: scores
      }
    });
  });
});

// ============ 错题本接口 ============

// 获取错题列表
app.get('/api/wrong-questions', (req, res) => {
  const { student_id, subject } = req.query;

  if (!student_id) {
    return res.status(400).json({ success: false, message: '请提供学生ID' });
  }

  let sql = `
    SELECT wq.*, qb.type, qb.content, qb.options, qb.correct_answer, qb.score, qb.analysis,
           qb.subject, qb.chapter, qb.difficulty, qb.tags,
           e.title as exam_title
    FROM wrong_questions wq
    JOIN question_bank qb ON wq.question_id = qb.id
    LEFT JOIN exams e ON wq.exam_id = e.id
    WHERE wq.student_id = ?
  `;
  const params = [student_id];

  if (subject) {
    sql += ' AND qb.subject = ?';
    params.push(subject);
  }

  sql += ' ORDER BY wq.created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }

    // 解析 options 和 tags
    const parsedRows = rows.map(row => {
      try {
        if (row.options) row.options = JSON.parse(row.options);
      } catch (e) { /* ignore */ }
      try {
        if (row.tags) row.tags = JSON.parse(row.tags);
      } catch (e) { /* ignore */ }
      return row;
    });

    res.json({ success: true, data: parsedRows });
  });
});

// 添加错题
app.post('/api/wrong-questions', (req, res) => {
  const { student_id, question_id, exam_id, student_answer } = req.body;

  if (!student_id || !question_id) {
    return res.status(400).json({ success: false, message: '学生ID和题目ID为必填项' });
  }

  // 检查题目是否存在
  db.get('SELECT * FROM question_bank WHERE id = ?', [question_id], (err, question) => {
    if (err || !question) {
      return res.status(404).json({ success: false, message: '题目不存在' });
    }

    db.run(
      'INSERT OR IGNORE INTO wrong_questions (student_id, question_id, exam_id, student_answer) VALUES (?, ?, ?, ?)',
      [student_id, question_id, exam_id || null, student_answer || ''],
      function(err) {
        if (err) {
          return res.status(500).json({ success: false, message: '添加错题失败' });
        }
        res.json({ success: true, message: '错题已添加', data: { id: this.lastID } });
      }
    );
  });
});

// ============ 练习模式接口 ============

// 获取练习题目（根据错题或随机）
app.get('/api/practice/questions', (req, res) => {
  const { student_id, type, subject, count = 10 } = req.query;
  
  if (!student_id) {
    return res.status(400).json({ success: false, message: '请提供学生ID' });
  }
  
  let sql;
  let params;
  
  if (type === 'wrong') {
    // 从错题本中选题
    sql = `
      SELECT qb.*, wq.student_answer as wrong_answer
      FROM question_bank qb
      JOIN wrong_questions wq ON qb.id = wq.question_id
      WHERE wq.student_id = ?
      ${subject ? 'AND qb.subject = ?' : ''}
      ORDER BY RANDOM()
      LIMIT ?
    `;
    params = subject ? [student_id, subject, parseInt(count)] : [student_id, parseInt(count)];
  } else if (type === 'random') {
    // 随机选题
    sql = `
      SELECT * FROM question_bank
      WHERE 1=1
      ${subject ? 'AND subject = ?' : ''}
      ORDER BY RANDOM()
      LIMIT ?
    `;
    params = subject ? [subject, parseInt(count)] : [parseInt(count)];
  } else {
    // 默认：智能推荐（优先错题，不足则补充随机题）
    sql = `
      SELECT qb.*, 'wrong' as source FROM question_bank qb
      JOIN wrong_questions wq ON qb.id = wq.question_id
      WHERE wq.student_id = ?
      ${subject ? 'AND qb.subject = ?' : ''}
      UNION ALL
      SELECT qb.*, 'random' as source FROM question_bank qb
      WHERE qb.id NOT IN (
        SELECT question_id FROM wrong_questions WHERE student_id = ?
      )
      ${subject ? 'AND qb.subject = ?' : ''}
      ORDER BY source DESC, RANDOM()
      LIMIT ?
    `;
    params = subject 
      ? [student_id, subject, student_id, subject, parseInt(count)]
      : [student_id, student_id, parseInt(count)];
  }
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('获取练习题目失败:', err);
      return res.status(500).json({ success: false, message: '获取题目失败' });
    }
    
    // 解析options
    const parsedRows = rows.map(row => {
      try {
        if (row.options) row.options = JSON.parse(row.options);
      } catch (e) { /* ignore */ }
      return row;
    });
    
    res.json({ success: true, data: parsedRows });
  });
});

// 提交练习答案
app.post('/api/practice/submit', (req, res) => {
  const { student_id, answers, questions } = req.body;
  
  if (!student_id || !answers || !questions) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  let correctCount = 0;
  let wrongCount = 0;
  const results = [];
  
  questions.forEach(q => {
    const studentAnswer = answers[q.id];
    const correctAnswer = q.correct_answer;
    
    // 评分逻辑（与考试相同）
    let isCorrect = false;
    
    if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '') {
      isCorrect = false;
    } else if (q.type === 'FILL' || q.type === 'fill') {
      const studentNormalized = String(studentAnswer).trim().toLowerCase();
      const correctAnswers = String(correctAnswer).split('|').map(a => a.trim().toLowerCase());
      isCorrect = correctAnswers.includes(studentNormalized);
    } else if (q.type === 'MULTIPLE' || q.type === 'multiple') {
      const studentSorted = String(studentAnswer).split(',').sort().join(',');
      const correctSorted = String(correctAnswer).split(',').sort().join(',');
      isCorrect = studentSorted === correctSorted;
    } else {
      isCorrect = String(studentAnswer).trim() === String(correctAnswer).trim();
    }
    
    if (isCorrect) {
      correctCount++;
    } else {
      wrongCount++;
      // 添加错题到错题本
      db.run(
        'INSERT OR IGNORE INTO wrong_questions (student_id, question_id, exam_id, student_answer) VALUES (?, ?, ?, ?)',
        [student_id, q.id, null, studentAnswer || '']
      );
    }
    
    results.push({
      question_id: q.id,
      is_correct: isCorrect,
      student_answer: studentAnswer,
      correct_answer: correctAnswer,
      analysis: q.analysis
    });
  });
  
  const total = questions.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  
  res.json({
    success: true,
    data: {
      total: total,
      correct_count: correctCount,
      wrong_count: wrongCount,
      accuracy: accuracy,
      results: results
    }
  });
});

// ============ AI助手接口 ============

// 获取AI回复（模拟）
app.post('/api/ai/chat', (req, res) => {
  const { user_id, message, context } = req.body;

  // 保存用户消息
  db.run('INSERT INTO ai_conversations (user_id, role, content) VALUES (?, ?, ?)',
    [user_id, 'user', message]);

  // 模拟AI回复
  let aiResponse = '';
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('考试') || lowerMsg.includes('成绩')) {
    aiResponse = '我可以帮您查看考试成绩分析，或者为您推荐适合的复习资料。您想查看哪次考试的成绩呢？';
  } else if (lowerMsg.includes('学习') || lowerMsg.includes('复习')) {
    aiResponse = '根据您的学习记录，我建议您重点关注数学和英语科目。我可以为您生成个性化的学习计划，需要吗？';
  } else if (lowerMsg.includes('错题') || lowerMsg.includes('错误')) {
    aiResponse = '分析您的错题模式，发现您在选择题部分表现较好，但在填空题上需要加强。建议多做相关练习。';
  } else if (lowerMsg.includes('你好') || lowerMsg.includes('您好')) {
    aiResponse = '您好！我是一心智考的AI学习助手，可以帮助您分析成绩、制定学习计划、解答学习问题。有什么可以帮助您的吗？';
  } else {
    aiResponse = '我理解您的问题。作为您的AI学习助手，我可以帮您：\n1. 分析考试成绩和薄弱环节\n2. 制定个性化学习计划\n3. 推荐适合的学习资料\n4. 解答学习中的疑问\n\n请告诉我您具体需要什么帮助？';
  }

  // 保存AI回复
  db.run('INSERT INTO ai_conversations (user_id, role, content) VALUES (?, ?, ?)',
    [user_id, 'assistant', aiResponse]);

  res.json({
    success: true,
    data: { response: aiResponse }
  });
});

// 获取AI学习建议
app.post('/api/ai/suggestions', (req, res) => {
  const { student_id } = req.body;

  // 获取学生成绩数据
  db.all('SELECT * FROM scores WHERE student_id = ? ORDER BY submitted_at DESC LIMIT 5', [student_id], (err, scores) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }

    const suggestions = {
      overall: '您的学习表现稳定，建议继续保持当前的学习节奏。',
      strengths: ['基础知识掌握扎实', '考试态度认真'],
      weaknesses: ['需要提高解题速度', '部分知识点理解不够深入'],
      recommendations: [
        '建议每天安排1-2小时专项练习',
        '重点关注错题，建立错题本',
        '定期进行模拟测试',
        '多与老师和同学交流学习心得'
      ],
      study_plan: {
        daily: '每天学习2-3小时，包含复习和练习',
        weekly: '每周完成一套模拟试卷',
        monthly: '每月进行一次全面知识梳理'
      }
    };

    if (scores.length > 0) {
      const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
      if (avgScore >= 90) {
        suggestions.overall = '您的成绩非常优秀！建议挑战更高难度的题目，保持领先优势。';
      } else if (avgScore >= 70) {
        suggestions.overall = '您的成绩良好，通过针对性练习可以进一步提高。';
      } else {
        suggestions.overall = '您的基础还需要加强，建议从基础知识开始系统复习。';
      }
    }

    res.json({ success: true, data: suggestions });
  });
});

// ============ 数据导出接口 ============

// 导出成绩数据为CSV
app.get('/api/export/scores', (req, res) => {
  const { exam_id, student_id } = req.query;
  
  let sql = `
    SELECT s.id, s.score, s.correct_count, s.wrong_count, s.submitted_at,
           e.title as exam_title, e.total_score,
           u.name as student_name, u.username as student_username
    FROM scores s
    JOIN exams e ON s.exam_id = e.id
    JOIN users u ON s.student_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (exam_id) {
    sql += ' AND s.exam_id = ?';
    params.push(exam_id);
  }
  if (student_id) {
    sql += ' AND s.student_id = ?';
    params.push(student_id);
  }
  
  sql += ' ORDER BY s.submitted_at DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }
    
    // 生成CSV内容
    const headers = ['考试名称', '学生姓名', '学号', '得分', '总分', '正确数', '错误数', '正确率', '提交时间'];
    const csvRows = [headers.join(',')];
    
    rows.forEach(row => {
      const percentage = row.total_score > 0 ? Math.round((row.score / row.total_score) * 100) : 0;
      const csvRow = [
        `"${row.exam_title || ''}"`,
        `"${row.student_name || ''}"`,
        `"${row.student_username || ''}"`,
        row.score,
        row.total_score,
        row.correct_count || 0,
        row.wrong_count || 0,
        `${percentage}%`,
        `"${row.submitted_at || ''}"`
      ];
      csvRows.push(csvRow.join(','));
    });
    
    const csvContent = '\ufeff' + csvRows.join('\n'); // 添加BOM以支持中文
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=scores.csv');
    res.send(csvContent);
  });
});

// 导出错题本为CSV
app.get('/api/export/wrong-questions', (req, res) => {
  const { student_id } = req.query;
  
  if (!student_id) {
    return res.status(400).json({ success: false, message: '请提供学生ID' });
  }
  
  const sql = `
    SELECT wq.*, qb.type, qb.content, qb.correct_answer, qb.analysis,
           qb.subject, qb.chapter, qb.difficulty,
           e.title as exam_title
    FROM wrong_questions wq
    JOIN question_bank qb ON wq.question_id = qb.id
    LEFT JOIN exams e ON wq.exam_id = e.id
    WHERE wq.student_id = ?
    ORDER BY wq.created_at DESC
  `;
  
  db.all(sql, [student_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }
    
    // 生成CSV内容
    const headers = ['科目', '章节', '题目类型', '题目内容', '你的答案', '正确答案', '难度', '考试名称', '添加时间'];
    const csvRows = [headers.join(',')];
    
    rows.forEach(row => {
      const typeMap = {
        'SINGLE': '单选题', 'MULTIPLE': '多选题', 'TRUE_FALSE': '判断题',
        'FILL': '填空题', 'ESSAY': '简答题'
      };
      const csvRow = [
        `"${row.subject || ''}"`,
        `"${row.chapter || ''}"`,
        `"${typeMap[row.type] || row.type || ''}"`,
        `"${(row.content || '').replace(/"/g, '""')}"`,
        `"${(row.student_answer || '').replace(/"/g, '""')}"`,
        `"${(row.correct_answer || '').replace(/"/g, '""')}"`,
        `"${row.difficulty || ''}"`,
        `"${row.exam_title || ''}"`,
        `"${row.created_at || ''}"`
      ];
      csvRows.push(csvRow.join(','));
    });
    
    const csvContent = '\ufeff' + csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=wrong_questions.csv');
    res.send(csvContent);
  });
});

// ============ 学习资料接口 ============

// 获取学习资料列表
app.get('/api/materials', (req, res) => {
  const { subject, type } = req.query;

  let sql = 'SELECT m.*, u.name as author_name FROM materials m LEFT JOIN users u ON m.created_by = u.id WHERE 1=1';
  const params = [];

  if (subject) {
    sql += ' AND m.subject = ?';
    params.push(subject);
  }
  if (type) {
    sql += ' AND m.type = ?';
    params.push(type);
  }

  sql += ' ORDER BY m.created_at DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// ============ 用户管理接口 ============

// 获取用户列表
app.get('/api/users', (req, res) => {
  const { role } = req.query;
  let query = 'SELECT id, username, email, name, role, status, created_at FROM users';
  let params = [];
  
  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '查询失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// 获取用户信息
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;

  db.get('SELECT id, username, email, name, role, avatar, status, created_at FROM users WHERE id = ?', [userId], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: row });
  });
});

// 更新用户信息
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { name, email, avatar } = req.body;

  db.run(
    'UPDATE users SET name = ?, email = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, email, avatar, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '更新失败' });
      }
      res.json({ success: true, message: '更新成功' });
    }
  );
});

// 删除用户
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '删除失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  });
});

// ============ 学生功能API ============

// 获取任务列表
app.get('/api/tasks', (req, res) => {
  const { student_id, grade } = req.query;
  
  if (!grade && !student_id) {
    return res.status(400).json({ success: false, message: '需要年级或学生ID' });
  }

  let query = `
    SELECT t.*, 
      CASE WHEN tr.id IS NOT NULL THEN tr.status ELSE 'PENDING' END as user_status,
      tr.completed_at
    FROM tasks t
    LEFT JOIN task_records tr ON t.id = tr.task_id AND tr.student_id = ?
    WHERE t.status = 'ACTIVE'
  `;
  const params = [student_id || 0];
  
  if (grade) {
    query += ' AND t.grade = ?';
    params.push(grade);
  }
  
  query += ' ORDER BY t.created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '获取任务失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// 开始/完成任务
app.post('/api/tasks/:id/complete', (req, res) => {
  const taskId = req.params.id;
  const { student_id } = req.body;
  
  db.run(
    "INSERT OR REPLACE INTO task_records (task_id, student_id, status, completed_at) VALUES (?, ?, 'COMPLETED', CURRENT_TIMESTAMP)",
    [taskId, student_id],
    function(err) {
      if (err) {
        return res.status(500).json({ success: false, message: '完成任务失败' });
      }
      
      // 记录活动
      db.run(
        'INSERT INTO activities (user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?)',
        [student_id, 'TASK_COMPLETE', '完成任务', '完成了一项任务', taskId],
        (actErr) => { if (actErr) console.error('记录活动失败:', actErr); }
      );
      
      res.json({ success: true, message: '任务已完成' });
    }
  );
});

// 获取考试记录
app.get('/api/exam-records', (req, res) => {
  const { student_id } = req.query;
  
  if (!student_id) {
    return res.status(400).json({ success: false, message: '需要学生ID' });
  }
  
  db.all(`
    SELECT er.*, e.title, e.total_score, s.score as final_score, s.correct_count, s.wrong_count
    FROM exam_records er
    JOIN exams e ON er.exam_id = e.id
    LEFT JOIN scores s ON er.exam_id = s.exam_id AND er.student_id = s.student_id
    WHERE er.student_id = ?
    ORDER BY er.created_at DESC
  `, [student_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '获取考试记录失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// 获取个人信息
app.get('/api/users/:id/profile', (req, res) => {
  const userId = req.params.id;
  
  db.get(`
    SELECT id, username, email, name, role, grade, avatar, bio, created_at
    FROM users WHERE id = ?
  `, [userId], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: row });
  });
});

// 更新个人信息
app.put('/api/users/:id/profile', (req, res) => {
  const userId = req.params.id;
  const { name, email, avatar, bio, grade } = req.body;
  
  db.run(`
    UPDATE users 
    SET name = ?, email = ?, avatar = ?, bio = ?, grade = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [name, email, avatar, bio, grade, userId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '更新失败' });
    }
    
    // 记录活动
    db.run(
      'INSERT INTO activities (user_id, type, title, content) VALUES (?, ?, ?, ?)',
      [userId, 'PROFILE_UPDATE', '更新个人信息', '更新了个人资料'],
      (actErr) => { if (actErr) console.error('记录活动失败:', actErr); }
    );
    
    res.json({ success: true, message: '更新成功' });
  });
});

// 获取消息列表
app.get('/api/messages', (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ success: false, message: '需要用户ID' });
  }
  
  db.all(`
    SELECT m.*, u.name as sender_name
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.target_type = 'ALL' 
      OR (m.target_type = 'USER' AND m.target_id = ?)
    ORDER BY m.created_at DESC
  `, [user_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '获取消息失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// 获取未读消息数
app.get('/api/messages/unread-count', (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ success: false, count: 0 });
  }
  
  db.get(`
    SELECT COUNT(*) as count FROM messages 
    WHERE (target_type = 'ALL' OR (target_type = 'USER' AND target_id = ?))
    AND is_read = 0
  `, [user_id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, count: 0 });
    }
    res.json({ success: true, count: row ? row.count : 0 });
  });
});

// 标记消息已读
app.put('/api/messages/:id/read', (req, res) => {
  const msgId = req.params.id;
  
  db.run('UPDATE messages SET is_read = 1 WHERE id = ?', [msgId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: '标记失败' });
    }
    res.json({ success: true, message: '已标记为已读' });
  });
});

// 获取个人动态
app.get('/api/activities', (req, res) => {
  const { user_id, limit = 20 } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ success: false, message: '需要用户ID' });
  }
  
  db.all(`
    SELECT * FROM activities
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `, [user_id, parseInt(limit)], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: '获取动态失败' });
    }
    res.json({ success: true, data: rows });
  });
});

// ========== 练习模式 API ==========
// 获取练习题
app.get('/api/practice/questions', (req, res) => {
  const { student_id, type, subject, count = 10 } = req.query;
  
  console.log('获取练习题:', { student_id, type, subject, count });
  
  try {
    if (type === 'smart' || type === 'wrong') {
      // 智能推荐/错题练习：从错题本中获取
      const sql = subject 
        ? `SELECT DISTINCT q.* FROM wrong_questions wq JOIN question_bank q ON wq.question_id = q.id WHERE wq.student_id = ? AND q.subject = ? ORDER BY RANDOM() LIMIT ?`
        : `SELECT DISTINCT q.* FROM wrong_questions wq JOIN question_bank q ON wq.question_id = q.id WHERE wq.student_id = ? ORDER BY RANDOM() LIMIT ?`;
      
      const params = subject ? [student_id, subject, parseInt(count)] : [student_id, parseInt(count)];
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('查询错题失败:', err);
          return res.status(500).json({ success: false, message: '获取练习题失败', error: err.message });
        }
        
        if (rows && rows.length > 0) {
          // 解析选项
          const questions = rows.map(q => ({
            ...q,
            options: q.options ? JSON.parse(q.options) : []
          }));
          
          console.log(`获取到 ${questions.length} 道练习题`);
          res.json({ success: true, data: questions });
        } else {
          // 错题本为空，返回随机题目
          console.log('错题本为空，返回随机题目');
          getRandomQuestions(subject, parseInt(count), (questions) => {
            res.json({ success: true, data: questions });
          });
        }
      });
    } else {
      // 随机练习
      getRandomQuestions(subject, parseInt(count), (questions) => {
        res.json({ success: true, data: questions });
      });
    }
  } catch (error) {
    console.error('获取练习题失败:', error);
    res.status(500).json({ success: false, message: '获取练习题失败', error: error.message });
  }
});

// 辅助函数：获取随机题目
function getRandomQuestions(subject, count, callback) {
  const sql = subject 
    ? `SELECT * FROM question_bank WHERE subject = ? ORDER BY RANDOM() LIMIT ?`
    : `SELECT * FROM question_bank ORDER BY RANDOM() LIMIT ?`;
  
  const params = subject ? [subject, count] : [count];
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('查询随机题目失败:', err);
      return callback([]);
    }
    
    const questions = rows ? rows.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : []
    })) : [];
    
    callback(questions);
  });
}

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`数据库文件：${path.resolve('./exam_system.db')}`);
});

// 优雅关闭
const cleanup = () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('数据库连接已关闭');
    process.exit(0);
  });
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
