import { useState } from 'react';
import type ExcelJS from 'exceljs';
import { transformQpcrData } from '../../lib/qpcr-transform';

interface TransformProps {
  workbook: ExcelJS.Workbook | null;
  sheetName: string;
  onComplete: (geneNames: string[]) => void;
}

type Status = 'ready' | 'processing' | 'success' | 'error';

export default function Transform({ workbook, sheetName, onComplete }: TransformProps) {
  const [status, setStatus] = useState<Status>('ready');
  const [errorMsg, setErrorMsg] = useState('');

  const canExecute = workbook && sheetName && status !== 'processing';

  async function handleExecute() {
    if (!workbook || !sheetName) return;

    try {
      setStatus('processing');

      const sourceSheet = workbook.getWorksheet(sheetName);
      if (!sourceSheet) throw new Error('工作表未找到');

      const { sheet, geneNames } = transformQpcrData(sourceSheet);

      const existing = workbook.getWorksheet('Transformed Data');
      if (existing) workbook.removeWorksheet(existing.id);

      const newSheet = workbook.addWorksheet(sheet.name);
      sheet.eachRow((row, rowNumber) => {
        const newRow = newSheet.getRow(rowNumber);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const newCell = newRow.getCell(colNumber);
          newCell.value = cell.value;
          if (cell.fill) newCell.fill = { ...cell.fill };
          if (cell.font) newCell.font = { ...cell.font };
        });
        newRow.commit();
      });

      setStatus('success');
      onComplete(geneNames);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  const statusLabels: Record<Status, string> = {
    ready: '待执行',
    processing: '处理中...',
    success: '完成',
    error: '出错',
  };

  const statusColors: Record<Status, string> = {
    ready: 'var(--text-secondary)',
    processing: 'var(--accent)',
    success: '#22c55e',
    error: 'var(--red)',
  };

  const badgeColor = status === 'success' ? '#22c55e' : 'var(--accent)';

  return (
    <div className="transform-step">
      <div className="transform-header">
        <div className="step-badge" style={{ background: badgeColor }}>1</div>
        <div className="transform-info">
          <h3 className="transform-title">数据转换</h3>
          <span className="transform-desc">转换为转置表格，缺失值自动处理并标黄</span>
        </div>
        <span className="transform-status" style={{ color: statusColors[status] }}>
          {status === 'error' && errorMsg ? `出错: ${errorMsg}` : statusLabels[status]}
        </span>
      </div>
      <button
        className="btn btn-accent transform-execute"
        onClick={handleExecute}
        disabled={!canExecute}
      >
        执行转换
      </button>
    </div>
  );
}
