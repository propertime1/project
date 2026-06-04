const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./exam_system.db');

console.log('检查数据库用户...\n');

db.all('SELECT id, username, email, name, role FROM users', (err, rows) => {
    if (err) {
        console.error('查询失败:', err);
    } else {
        console.log(`找到 ${rows.length} 个用户：`);
        rows.forEach(row => {
            console.log(`  ID: ${row.id}, 用户名: ${row.username}, 角色: ${row.role}, 姓名: ${row.name}`);
        });
    }
    
    // 检查密码hash
    db.all('SELECT id, username, SUBSTR(password, 1, 20) as pwd_preview FROM users', (err, rows2) => {
        if (err) {
            console.error('查询密码失败:', err);
        } else {
            console.log('\n密码哈希（前20位）：');
            rows2.forEach(row => {
                console.log(`  ${row.username}: ${row.pwd_preview}...`);
            });
        }
        db.close();
    });
});
