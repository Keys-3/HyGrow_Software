export async function downloadLogCsv(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadLogArchive(filename: string, contents: Uint8Array) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(contents).buffer], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
