var err = '';
try {
  if (app.beginUndoGroup) err += 'app.beginUndoGroup exists; ';
  if (app.project.beginUndoGroup) err += 'app.project.beginUndoGroup exists; ';
} catch(e) { err = e.message; }
err;
