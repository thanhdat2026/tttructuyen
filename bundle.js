(function() {
  console.error("LỖI: Tệp bundle.js này là một placeholder. Nó cần được thay thế bằng tệp JavaScript đã được biên dịch từ mã nguồn ứng dụng của bạn. Hãy chạy lệnh 'npm run build' và sử dụng tệp được tạo ra trong thư mục 'dist'.");
  
  const root = document.getElementById('root');
  if (root) {
    root.style.padding = '40px';
    root.style.textAlign = 'center';
    root.style.fontFamily = 'sans-serif';
    root.style.lineHeight = '1.6';
    root.innerHTML = '<h1>Lỗi Cấu hình Ứng dụng</h1>' +
      '<p>Ứng dụng chưa được biên dịch. Tệp <code>bundle.js</code> hiện tại chỉ là một tệp giữ chỗ.</p>' +
      '<p style="font-weight: bold; margin-top: 20px;">Để khắc phục, bạn cần:</p>' +
      '<ol style="text-align: left; display: inline-block;">' +
      '<li>Chạy lệnh <strong>npm install</strong> trong thư mục dự án.</li>' +
      '<li>Chạy lệnh <strong>npm run build</strong> để biên dịch ứng dụng.</li>' +
      '<li>Triển khai (deploy) nội dung của thư mục <strong>dist</strong> vừa được tạo ra.</li>' +
      '</ol>';
  }
})();
