/**
 * dsh-widgets showcase — requirement form → widget specification generator.
 * Mirrors docs/workflow/01 (form) and 03 (spec shape). Fully bilingual:
 * labels and the generated spec follow the current site language.
 */
(function () {
  'use strict';

  var REQUIRED = ['f-name', 'f-purpose', 'f-size', 'f-title', 'f-content', 'f-display', 'f-category'];

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function t(key, vars) { return window.DASH_I18N.t(key, vars); }

  function markMissing() {
    var missing = [];
    REQUIRED.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var ok = el.value.trim() !== '';
      el.style.borderColor = ok ? '' : 'var(--dsw-err)';
      if (!ok) missing.push(el.closest('.field') ? el.closest('.field').querySelector('span').textContent.trim().replace(/\s*必填.*$/, '').replace(/\s*required.*$/, '') : id);
    });
    return missing;
  }

  function clearMarks() {
    REQUIRED.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.borderColor = '';
    });
  }

  function buildSpec() {
    var sizeLabel = { '2x2': '2x2', '2x4': '2x4', both: '2x2, 2x4' }[val('f-size')] || val('f-size');
    var langSection = window.DASH_I18N.lang() === 'zh'
      ? ['-- 产品（Human-owned，实现时逐项满足）--']
      : ['-- Product (Human-owned, implement exactly) --'];
    var langAgent = window.DASH_I18N.lang() === 'zh'
      ? ['-- 技术说明（Agent-owned，Agent 分析）--']
      : ['-- Agent Notes (technical, agent analyzes) --'];
    var lines = [
      'Widget Specification',
      'schema: dsh-widgets/widget-spec/v1',
      '',
    ].concat(langSection, [
      'widgetId: <kebab-case-id>',
      'name: ' + val('f-name'),
      'purpose: ' + val('f-purpose'),
      'size: ' + sizeLabel,
      'title: ' + val('f-title'),
      'coreContent: ' + val('f-content'),
      'displayedData: ' + val('f-display'),
      'category: ' + val('f-category'),
      'existingOrNewCategory: ' + val('f-existing'),
      'priority: ' + val('f-priority'),
      'interaction: ' + (val('f-interaction') || '-'),
      'visualReference: ' + (val('f-visual') || '(none — ask the human before inventing)'),
      ''
    ], langAgent, [
      'dataSource: <agent analysis — do not block the human>',
      'providerAndCredentials: <agent analysis — credentials go through DSH host credentials>',
      'architecture: <widget-only | +shared | +provider | +host | +external — minimum necessary>',
      'forbiddenChanges: no edits outside src/widgets/<widgetId>/; no gen-registry/build/tsc; ' +
        'do not read other widget units (shared layer + template only)',
      '',
      '-- Acceptance --',
      'scripts/validate-widget-unit.mjs passes (MVW hard gates)',
      'id consistency: dir name === manifest.id === index.ts id literal',
      'locale.zh and locale.en names exist (market must recognize the widget)',
      'REWORK is normal; BLOCKED only for system-level violations (contract/registry/build/marketplace/regression)'
    ]);
    return lines.join('\n');
  }

  function setCode(text) {
    var pre = document.getElementById('spec-pre');
    if (!pre) return;
    var node = document.createElement('code');
    node.textContent = text;
    pre.innerHTML = '';
    pre.appendChild(node);
    pre.scrollTop = 0;
  }

  function init() {
    var gen = document.getElementById('gen-spec');
    var copyBtn = document.getElementById('copy-spec');
    var reset = document.getElementById('reset-form');
    var pre = document.getElementById('spec-pre');

    if (gen && pre) {
      gen.addEventListener('click', function () {
        clearMarks();
        var missing = markMissing();
        if (missing.length) {
          setCode(t('specMissing', { n: missing.length, list: missing.join(' · ') }));
          if (copyBtn) copyBtn.disabled = true;
          return;
        }
        setCode(buildSpec());
        if (copyBtn) copyBtn.disabled = false;
      });
    }
    if (copyBtn && pre) {
      copyBtn.addEventListener('click', function () {
        window.DASH_UI.copy(pre.textContent || '', copyBtn, window.DASH_I18N.t('copied'));
      });
    }
    if (reset) {
      reset.addEventListener('click', function () {
        var form = document.getElementById('req-form');
        if (form) form.reset();
        clearMarks();
        if (pre) setCode(t('outPlaceholder'));
        if (copyBtn) copyBtn.disabled = true;
      });
    }
    document.addEventListener('dsh:lang', function () {
      if (pre && !copyBtn.disabled && pre.textContent.indexOf('Widget Specification') !== -1 && !pre.textContent.indexOf('schema:') === -1) {
        /* re-generate an already-generated spec in the new language */
        var needs = REQUIRED.every(function (id) { var el = document.getElementById(id); return el && el.value.trim() !== ''; });
        if (needs) setCode(buildSpec());
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();