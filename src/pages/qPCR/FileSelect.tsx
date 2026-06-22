import { open, save } from '@tauri-apps/plugin-dialog';
import { readExcelFile, getSheetNames, saveExcelFile, type ExcelFile } from '../../lib/excel-io';
import { FileSpreadsheet } from 'lucide-react';

interface FileSelectProps {
  file: ExcelFile | null;
  sheetName: string;
  onFileChange: (file: ExcelFile | null) => void;
  onSheetChange: (name: string) => void;
}

export default function FileSelect({ file, sheetName, onFileChange, onSheetChange }: FileSelectProps) {
  const sheets = file ? getSheetNames(file.workbook) : [];

  async function handleOpen() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });
    if (!selected) return;
    const filePath = Array.isArray(selected) ? selected[0] : selected;
    const name = filePath.split(/[/\\]/).pop() ?? filePath;
    const excelFile = await readExcelFile(filePath, name);
    onFileChange(excelFile);
    const names = getSheetNames(excelFile.workbook);
    onSheetChange(names[0] ?? '');
  }

  async function handleSave() {
    if (!file) return;
    const path = await save({
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      defaultPath: file.name,
    });
    if (!path) return;
    await saveExcelFile(file.workbook, path);
  }

  function handleClear() {
    onFileChange(null);
    onSheetChange('');
  }

  return (
    <div className="file-select">
      <div className="file-select-header">
        <h2 className="file-select-title">数据文件</h2>
        <div className="file-select-actions">
          <button className="btn btn-accent" onClick={handleOpen}>打开</button>
          <button className="btn" onClick={handleSave} disabled={!file}>保存</button>
          <button className="btn" onClick={handleClear} disabled={!file}>清空</button>
        </div>
      </div>

      {file ? (
        <div className="file-card">
          <div className="file-card-icon"><FileSpreadsheet size={24} strokeWidth={1.5} /></div>
          <div className="file-card-info">
            <span className="file-card-name">{file.name}</span>
            <span className="file-card-path">{file.path}</span>
          </div>
        </div>
      ) : (
        <div className="file-card file-card--empty">
          <span className="file-card-hint">点击「打开」选择 Excel 文件</span>
        </div>
      )}

      {file && sheets.length > 0 && (
        <div className="sheet-select">
          <label className="sheet-select-label">工作表</label>
          <select
            className="sheet-select-dropdown"
            value={sheetName}
            onChange={(e) => onSheetChange(e.target.value)}
          >
            {sheets.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
