<?php
// Legacy diagnostics must not reset credentials or disclose account data.
http_response_code(410);
header('Content-Type: application/json');
echo json_encode(['message' => 'This setup endpoint has been retired.']);
