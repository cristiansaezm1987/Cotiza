const fs = require('fs');
const path = require('path');

const STATUS_FILE = path.join(process.cwd(), 'lib', 'sync-status.json');

// Inicializa el archivo si no existe
const initStatus = () => {
    if (!fs.existsSync(STATUS_FILE)) {
        fs.writeFileSync(STATUS_FILE, JSON.stringify({
            incremental: { active: false, progress: 0, message: '' },
            full: { active: false, progress: 0, message: '' },
            excel: { active: false, progress: 0, message: '' }
        }));
    }
};

const getStatus = () => {
    try {
        initStatus();
        const data = fs.readFileSync(STATUS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {
            incremental: { active: false, progress: 0, message: '' },
            full: { active: false, progress: 0, message: '' },
            excel: { active: false, progress: 0, message: '' }
        };
    }
};

const updateStatus = (key, data) => {
    try {
        const current = getStatus();
        current[key] = { ...current[key], ...data };
        fs.writeFileSync(STATUS_FILE, JSON.stringify(current));
    } catch (e) {
        console.error('Error writing status file', e);
    }
};

module.exports = {
    getStatus,
    updateStatus
};
