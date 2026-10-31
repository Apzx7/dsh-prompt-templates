// dsh-prompt-templates —— 浏览器半：提示词模板面板。
//
// 结构：卡片网格 / 选择器弹窗 / 编辑弹窗 / 恢复默认。
//   内置模板可移出并在「恢复默认」后找回；分类与折叠状态持久化在宿主侧。
//   面板通过宿主 HTTP 端点读写数据，通过 inputActions 写入输入框，
//   图标为内联 SVG，翻译由内置字典处理，不引入额外依赖。
//
// 注册位置：
//   conversation.input.left    -> 图标按钮（输入框工具行左侧，dsh 为插件保留的空位）
//   conversation.input.overlay -> 输入框内浮层（由 composer 卡片提供定位与层叠上下文，
//                                 dsh 自己的 slash 菜单、@ 引用、skill 选择器都在这里）
// 数据走宿主半：GET /__prompt-templates/list、POST /__prompt-templates/mutate
window.__ModuleLoader__.load({
  id: 'dsh-prompt-templates',
  factory(require) {
    var module = { exports: {} }
    var exports = module.exports

    var React = require('react')
    var h = React.createElement

    // ---------------------------------------------------------------- i18n
    var ZH = {
      'tpl.title': '提示词模板',
      'tpl.hint': '点击卡片直接填入输入框，✏️ 可编辑或删除 · 也能新增自己的模板',
      'tpl.clickCard': '点击填入输入框',
      'tpl.editTpl': '编辑 / 删除模板',
      'tpl.openPicker': '提示词模板（常用提示词，随时取用）',
      'tpl.pickerTitle': '提示词模板',
      'tpl.pickerHint': '点击卡片直接填入输入框，✏️ 可编辑或删除 · 也能新增自己的模板',
      'tpl.add': '新建模板',
      'tpl.addDesc': '把常用工作流存成模板',
      'tpl.reset': '恢复默认模板',
      'tpl.resetConfirm': '确认恢复默认？',
      'tpl.builtin': '内置',
      'tpl.custom': '自定义',
      'tpl.newTitle': '新建提示词模板',
      'tpl.editTitle': '编辑提示词模板',
      'tpl.fieldIcon': '图标',
      'tpl.fieldTitle': '标题',
      'tpl.fieldTitlePh': '卡片上显示的短标题',
      'tpl.fieldDesc': '说明',
      'tpl.fieldDescPh': '一句话说明，显示在卡片中',
      'tpl.fieldPrompt': '提示词',
      'tpl.fieldPromptPh': '完整提示词 —— 发送给智能体的内容',
      'tpl.required': '标题和提示词不能为空',
      'tpl.fieldCommand': '快捷命令（可选）',
      'tpl.commandHint': '例如 /pr：输入 /pr 798 后发送，798 会替换正文中的 {{input}}；没有占位符时追加到末尾。',
      'tpl.commandInvalid': '命令须以英文字母开头，只能包含字母、数字、下划线和连字符',
      'tpl.commandDuplicate': '该命令已被其他模板使用',
      'tpl.storageError': '模板读取或保存失败',
      'tpl.save': '保存修改',
      'tpl.fill': '填入输入框',
      'tpl.fillTip': '填入输入框，可再编辑后发送',
      'tpl.sendNow': '直接发送',
      'tpl.sendTip': '立即作为新对话发送',
      'tpl.delete': '删除',
      'tpl.deleteTip': '删除这个自定义模板',
      'tpl.remove': '移出模板库',
      'tpl.removeTip': '把内置模板移出模板库，可在底部「恢复默认模板」找回',
      'tpl.restore': '恢复默认',
      'tpl.restoreTip': '撤掉你的修改，恢复内置默认',
      // ---- 分类 / 筛选 / AI ----
      'tpl.uncategorized': '未分类',
      'tpl.manageCategories': '管理分类',
      'tpl.manage': '管理',
      'tpl.searchPh': '搜索标题、说明、正文、分类或标签…',
      'tpl.filterTitle': '按分类或收藏筛选',
      'tpl.filterAll': '全部模板',
      'tpl.filterFavorite': '⭐ 收藏',
      'tpl.searchResult': '找到 {n} 个模板，点卡片填入输入框',
      'tpl.clearSearch': '清除搜索',
      'tpl.filterTags': '按标签筛选',
      'tpl.noMatch': '没有匹配的模板',
      'tpl.groupEmpty': '这个分类还没有模板',
      'tpl.favorite': '收藏',
      'tpl.unfavorite': '取消收藏',
      'tpl.fieldCategory': '所属分类',
      'tpl.fieldCategoryHint': '用于分组展示；也可以在列表里直接改',
      'tpl.fieldTags': '标签',
      'tpl.fieldTagsPh': '用逗号分隔，例如：Code Review, 代码质量, 安全审计',
      'tpl.smart': '✨ 智能识别',
      'tpl.smartTip': '让模型根据标题、说明和正文判断分类与标签（只提出建议，不会直接覆盖）',
      'tpl.smartRunning': '识别中…',
      'tpl.batch': '批量整理',
      'tpl.batchTip': '对所有模板给出分类与标签建议，确认后再应用',
      'tpl.suggestTitle': '智能分类建议',
      'tpl.suggestHint': '以下是模型给出的建议。勾选后点「确认应用」才会写入；不勾选的模板保持不变。',
      'tpl.suggestRunning': '正在识别…',
      'tpl.suggestFailed': '识别失败',
      'tpl.manualFirst': '手动设置优先：已有分类的模板不会自动改写',
      'tpl.applySuggest': '确认应用',
      'tpl.addCategory': '新建分类',
      'tpl.categoryNamePh': '分类名称',
      'tpl.categoryHint': '可以新建、重命名、删除和调整顺序；删除分类时其中的模板会移动到你指定的位置。',
      'tpl.removeCategoryHint': '删除这个分类？其中 {n} 个模板将被移动：',
      'tpl.moveToUncategorized': '移至未分类',
      'tpl.moveTo': '移动到…',
      'tpl.edit': '编辑',
      'tpl.cancel': '取消',
      'tpl.back': '返回模板库',
      close: '关闭',
    }
    var EN = {
      'tpl.title': 'Prompt templates',
      'tpl.hint': 'Click a card to fill the composer · ✏️ edits or deletes · add your own too',
      'tpl.clickCard': 'Click to fill the composer',
      'tpl.editTpl': 'Edit / delete template',
      'tpl.openPicker': 'Prompt templates (reuse your everyday prompts)',
      'tpl.pickerTitle': 'Prompt templates',
      'tpl.pickerHint': 'Click a card to fill the composer · ✏️ edits or deletes · add your own too',
      'tpl.add': 'New template',
      'tpl.addDesc': 'Save a workflow you repeat',
      'tpl.reset': 'Restore defaults',
      'tpl.resetConfirm': 'Confirm reset?',
      'tpl.builtin': 'Built-in',
      'tpl.custom': 'Custom',
      'tpl.newTitle': 'New prompt template',
      'tpl.editTitle': 'Edit prompt template',
      'tpl.fieldIcon': 'Icon',
      'tpl.fieldTitle': 'Title',
      'tpl.fieldTitlePh': 'Short title shown on the card',
      'tpl.fieldDesc': 'Description',
      'tpl.fieldDescPh': 'One line shown on the card',
      'tpl.fieldPrompt': 'Prompt',
      'tpl.fieldPromptPh': 'Full prompt — what gets sent to the agent',
      'tpl.required': 'Title and prompt are required',
      'tpl.fieldCommand': 'Slash command (optional)',
      'tpl.commandHint': 'For example /pr: typing /pr 798 sends 798 in place of {{input}}; without a placeholder it is appended.',
      'tpl.commandInvalid': 'A command must start with a letter and use only letters, digits, _ and -',
      'tpl.commandDuplicate': 'Another template already uses this command',
      'tpl.storageError': 'Template storage failed',
      'tpl.save': 'Save',
      'tpl.fill': 'Fill composer',
      'tpl.fillTip': 'Fill the composer, then edit and send',
      'tpl.sendNow': 'Send now',
      'tpl.sendTip': 'Send immediately as a new prompt',
      'tpl.delete': 'Delete',
      'tpl.deleteTip': 'Delete this custom template',
      'tpl.remove': 'Remove from library',
      'tpl.removeTip': 'Removes a built-in template; restore it with "Restore defaults"',
      'tpl.restore': 'Restore default',
      'tpl.restoreTip': 'Drop your edits and restore the built-in default',
      'tpl.uncategorized': 'Uncategorized',
      'tpl.manageCategories': 'Manage categories',
      'tpl.manage': 'Manage',
      'tpl.searchPh': 'Search title, description, body, category or tags…',
      'tpl.filterTitle': 'Filter by category or favorite',
      'tpl.filterAll': 'All templates',
      'tpl.filterFavorite': '⭐ Favorites',
      'tpl.searchResult': '{n} template(s) found — click a card to fill the composer',
      'tpl.clearSearch': 'Clear search',
      'tpl.filterTags': 'Filter by tag',
      'tpl.noMatch': 'No matching templates',
      'tpl.groupEmpty': 'No templates in this category yet',
      'tpl.favorite': 'Favorite',
      'tpl.unfavorite': 'Remove favorite',
      'tpl.fieldCategory': 'Category',
      'tpl.fieldCategoryHint': 'Used for grouping; you can also change it from the list',
      'tpl.fieldTags': 'Tags',
      'tpl.fieldTagsPh': 'Comma separated, e.g. code review, quality, security',
      'tpl.smart': '✨ Recognize',
      'tpl.smartTip': 'Ask the model to infer category and tags (suggestions only, never overwrites)',
      'tpl.smartRunning': 'Recognizing…',
      'tpl.batch': 'Sort all',
      'tpl.batchTip': 'Suggest categories and tags for every template, then apply on confirm',
      'tpl.suggestTitle': 'AI classification suggestions',
      'tpl.suggestHint': 'Suggestions only. Nothing is written until you confirm; unchecked templates stay unchanged.',
      'tpl.suggestRunning': 'Recognizing…',
      'tpl.suggestFailed': 'Failed',
      'tpl.manualFirst': 'Manual settings win: templates you already categorized are left alone',
      'tpl.applySuggest': 'Apply',
      'tpl.addCategory': 'New category',
      'tpl.categoryNamePh': 'Category name',
      'tpl.categoryHint': 'Create, rename, delete and reorder categories. Deleting one moves its templates where you choose.',
      'tpl.removeCategoryHint': 'Delete this category? {n} template(s) will move:',
      'tpl.moveToUncategorized': 'Move to Uncategorized',
      'tpl.moveTo': 'Move to…',
      'tpl.edit': 'Edit',
      'tpl.cancel': 'Cancel',
      'tpl.back': 'Back to templates',
      close: 'Close',
    }

    function currentDict() {
      try {
        var lang = (document.documentElement.lang || navigator.language || '').toLowerCase()
        return lang.indexOf('zh') === 0 ? ZH : EN
      } catch (error) {
        return ZH
      }
    }

    function t(key) {
      var dict = currentDict()
      return dict[key] !== undefined ? dict[key] : key
    }

    // ---------------------------------------------------------------- icons
    // 图标为内联线性 SVG，避免额外依赖。
    function svg(paths, size) {
      return function Icon(props) {
        return h(
          'svg',
          {
            width: (props && props.size) || size || 14,
            height: (props && props.size) || size || 14,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true',
            style: { display: 'block' },
          },
          paths.map(function (d, i) {
            return h('path', { d: d, key: i })
          }),
        )
      }
    }
    var FiPlus = svg(['M12 5v14', 'M5 12h14'])
    var FiEdit2 = svg(['M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'])
    var FiRotateCcw = svg(['M1 4v6h6', 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10'])
    var FiSend = svg(['M22 2 11 13', 'M22 2l-7 20-4-9-9-4 20-7z'])
    var FiTrash2 = svg([
      'M3 6h18',
      'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
      'M10 11v6',
      'M14 11v6',
      'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    ])
    var FiX = svg(['M18 6 6 18', 'M6 6l12 12'])
    var FiStar = svg(['M12 2.5l2.9 5.9 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.3l6.6-.9z'])
    var FiChevron = svg(['M9 6l6 6-6 6'])
    var FiSearch = svg(['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'])
    var FiSettings = svg([
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    ])

    // 触发按钮用的模板图标：网格 + 加号
    function GridIcon() {
      return h(
        'svg',
        {
          width: 15,
          height: 15,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          style: { display: 'block' },
        },
        h('rect', { x: 3, y: 3, width: 7.5, height: 7.5, rx: 2 }),
        h('rect', { x: 13.5, y: 3, width: 7.5, height: 7.5, rx: 2 }),
        h('rect', { x: 3, y: 13.5, width: 7.5, height: 7.5, rx: 2 }),
        h('path', { d: 'M17.25 14v6M14.25 17h6' }),
      )
    }

    // ---------------------------------------------------------------- styles
    // 视觉规则；变量层把 --text/--border/--accent… 映射到 dsh 主题 token。
    // ---------------------------------------------------------------- styles
    // Liquid Glass：半透明玻璃面板 + 内层轻玻璃卡片 + 统一圆角与柔和动效。
    // 颜色全部走 dsh 主题 token，明暗主题自动跟随；不支持 backdrop-filter 时降级为更实的底色。
    var CSS_VARS = [
      // ================= 材质层 =================
      // 面板：色阶取宿主菜单灰（#e9ecf2 亮 / 深色自动跟随），比页面暗，才有"玻璃"的可见对比
      // 透明度单点可调：45% / 55% / 65% 三档 A/B 只改 --lg-panel-alpha
      '--lg-panel-alpha: 55%',
      '--lg-panel-tint: var(--dsw-alias-bg-overlay)',
      '--lg-panel-fill: color-mix(in srgb, var(--lg-panel-tint) var(--lg-panel-alpha), transparent)',
      '--lg-panel-blur: var(--dsw-menu-backdrop-filter)',

      // 环境光：极低饱和的青蓝/雾紫/薄荷，只提供色相，不形成彩色圆斑
      '--lg-aur-1: color-mix(in srgb, #7fa8d4 20%, transparent)',
      '--lg-aur-2: color-mix(in srgb, #a89ac9 15%, transparent)',
      '--lg-aur-3: color-mix(in srgb, #7fc0c4 13%, transparent)',

      // 光标反光（由 JS 写入百分比）
      '--lg-px: 50%',
      '--lg-py: 0%',

      // 卡片/分组：用文字色做中性叠加 —— 亮色主题变暗、深色主题变亮，两种主题都成立
      '--lg-card-fill: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent)',
      '--lg-card-fill-hover: color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent)',
      '--lg-group-fill: color-mix(in srgb, var(--dsw-alias-label-primary) 2.5%, transparent)',
      '--lg-control-fill: color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent)',

      // 边缘：亮色主题为白色高光，深色主题单独覆盖
      '--lg-edge-top: color-mix(in srgb, #ffffff 52%, transparent)',
      '--lg-edge-side: color-mix(in srgb, #ffffff 14%, transparent)',
      '--lg-edge-bottom: color-mix(in srgb, #000000 7%, transparent)',
      '--lg-edge-card-top: color-mix(in srgb, #ffffff 26%, transparent)',
      '--lg-hairline: color-mix(in srgb, var(--dsw-alias-label-primary) 11%, transparent)',
      '--lg-hairline-strong: color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent)',
      '--lg-highlight: color-mix(in srgb, #ffffff 55%, transparent)',

      // ---- 文字 ----
      '--lg-text: var(--dsw-alias-label-primary)',
      '--lg-text-dim: var(--dsw-alias-label-secondary)',
      '--lg-text-faint: color-mix(in srgb, var(--dsw-alias-label-secondary) 78%, transparent)',
      '--lg-accent: var(--dsw-alias-brand-primary)',
      '--lg-accent-soft: color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent)',
      '--lg-danger: var(--dsw-alias-state-error-primary)',

      // ---- 阴影：轻量接触影 + 一层柔和扩散，不再堆四层 ----
      '--lg-shadow-ambient: 0 1px 2px rgba(0,0,0,.05), 0 14px 34px rgba(0,0,0,.10), 0 40px 84px rgba(0,0,0,.07)',
      '--lg-shadow-card: 0 1px 2px rgba(0,0,0,.04)',
      '--lg-shadow-card-hover: 0 1px 2px rgba(0,0,0,.05), 0 8px 20px rgba(0,0,0,.08)',

      // ---- 圆角层级：外层 > 分组 > 卡片 > 控件 > 小件 ----
      '--lg-r-panel: 32px',
      '--lg-r-inner: 24px',
      '--lg-r-card: 18px',
      '--lg-r-control: 12px',
      '--lg-r-chip: 8px',

      '--lg-ease: cubic-bezier(.22,.61,.36,1)',
      '--lg-dur: 220ms',

      // 旧变量名别名，保持既有规则兼容
      '--text: var(--lg-text)',
      '--text-dim: var(--lg-text-dim)',
      '--text-faint: var(--lg-text-faint)',
      '--border: var(--lg-hairline)',
      '--bg-elev: var(--lg-panel-fill)',
      '--bg-base: var(--lg-control-fill)',
      '--accent: var(--lg-accent)',
      '--accent-soft: var(--lg-accent-soft)',
      '--red: var(--lg-danger)',
    ].join(';')

    var CSS_RULES = [
      // ---------- 触发按钮 ----------
      '.dpt-trigger{display:inline-flex;align-items:center;justify-content:center;height:26px;min-width:28px;padding:0 7px;border:1px solid transparent;border-radius:10px;background:transparent;color:var(--lg-text-dim);cursor:pointer;transition:background var(--lg-dur) var(--lg-ease),color var(--lg-dur) var(--lg-ease),transform 160ms var(--lg-ease)}',
      '.dpt-trigger:hover{background:var(--lg-card-bg-hover);color:var(--lg-text)}',
      '.dpt-trigger:active{transform:scale(.94)}',
      '.dpt-trigger[data-active="true"]{background:var(--lg-accent-soft);color:var(--lg-accent)}',

      // ---------- 面板容器（外层玻璃） ----------
      '.dpt-overlay{position:absolute;left:0;right:0;bottom:8px;z-index:30;display:flex;justify-content:center;pointer-events:none;max-height:var(--dpt-room,72vh);animation:dpt-fade-in 240ms var(--lg-ease) both}',
      '.dpt-overlay>*{pointer-events:auto;max-height:100%}',
      '@keyframes dpt-fade-in{from{opacity:0}to{opacity:1}}',
      '@keyframes dpt-panel-in{from{opacity:0;transform:translateY(10px) scale(.972);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}',
      '.modal{display:flex;flex-direction:column;width:100%;padding:6px;color:var(--lg-text);box-sizing:border-box;position:relative;border-radius:var(--lg-r-panel);isolate:true}',
      // 玻璃主体：半透明底 + 模糊 + 饱和增强 + 顶部内高光 + 环境阴影
      // 环境光层：画在玻璃之下（z-index:-2），玻璃的 backdrop-filter 采样它 → 白底上也能透出环境色
      '.modal::after{content:"";position:absolute;inset:0;z-index:-2;border-radius:inherit;pointer-events:none;background:radial-gradient(115% 85% at 20% 2%,var(--lg-aur-1),transparent 64%),radial-gradient(95% 75% at 86% 10%,var(--lg-aur-2),transparent 62%),radial-gradient(85% 65% at 52% 104%,var(--lg-aur-3),transparent 64%)}',
      // 主玻璃：宿主同款材质（58% 灰 + blur(40) saturate(150)），顶部镜面高光 + 底部厚度暗边 + 光标反光
      '.modal::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;background-color:var(--lg-panel-fill);background-image:radial-gradient(460px circle at var(--lg-px) var(--lg-py),color-mix(in srgb,#ffffff 13%,transparent),transparent 62%);backdrop-filter:var(--lg-panel-blur);-webkit-backdrop-filter:var(--lg-panel-blur);box-shadow:inset 0 1px 0 var(--lg-edge-top),inset 0 -1px 0 var(--lg-edge-bottom),inset 1px 0 0 var(--lg-edge-side),inset -1px 0 0 var(--lg-edge-side),var(--lg-shadow-ambient)}',
      '.modal.template-picker{max-width:1120px;max-height:100%}',
      '.modal.template-modal{max-width:620px;max-height:100%}',
      '.modal{animation:dpt-panel-in var(--lg-dur) var(--lg-ease) both}',

      // ---------- 顶栏 / 底栏（独立玻璃层次） ----------
      '.template-picker-top,.template-modal-head{flex-shrink:0;display:flex;flex-direction:column;gap:8px;padding:12px 14px 10px;border-radius:calc(var(--lg-r-panel) - 10px);background:linear-gradient(to bottom, color-mix(in srgb, var(--lg-glass-bg-strong) 30%, transparent), transparent);position:relative}',
      '.template-picker-top::after,.template-modal-head::after{content:"";position:absolute;left:14px;right:14px;bottom:0;height:1px;background:linear-gradient(to right,transparent,var(--lg-hairline),transparent)}',
      '.template-picker-head,.template-modal-head{flex-direction:row;align-items:center;gap:10px;display:flex;padding:0;border-radius:0;background:none}',
      '.template-picker-head::after,.template-modal-head::after{display:none}',
      '.template-picker-title,.template-modal-title{color:var(--lg-text);flex:1;min-width:0;font-size:15px;font-weight:640;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.template-picker-hint{color:var(--lg-text-faint);font-size:11.5px;line-height:1.5}',
      '.template-modal-icon{flex-shrink:0;font-size:19px;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:10px;background:var(--lg-card-bg);border:1px solid var(--lg-hairline)}',
      '.template-modal-badge{color:var(--lg-accent);background:var(--lg-accent-soft);border:1px solid color-mix(in srgb,var(--lg-accent) 32%,transparent);white-space:nowrap;border-radius:999px;flex-shrink:0;padding:2px 9px;font-size:10.5px;font-weight:650;letter-spacing:.02em}',

      // 圆形图标按钮
      '.template-modal-close{width:30px;height:30px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;padding:0;border-radius:50%;border:1px solid transparent;background:transparent;color:var(--lg-text-dim);cursor:pointer;transition:background var(--lg-dur) var(--lg-ease),color var(--lg-dur) var(--lg-ease),transform 160ms var(--lg-ease)}',
      '.template-modal-close:hover{background:var(--lg-card-bg-hover);color:var(--lg-text);border-color:var(--lg-hairline)}',
      '.template-modal-close:active{transform:scale(.92)}',

      // 滚动区：无生硬分割线，顶部轻微渐隐
      '.template-picker-scroll,.template-modal-body{flex:auto;min-height:0;width:100%;box-sizing:border-box;margin:0;padding:12px 14px 14px;overflow-y:auto;overflow-x:clip;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--lg-hairline-strong) transparent}',
      '.template-picker-scroll::-webkit-scrollbar,.template-modal-body::-webkit-scrollbar{width:8px}',
      '.template-picker-scroll::-webkit-scrollbar-thumb,.template-modal-body::-webkit-scrollbar-thumb{background:var(--lg-hairline-strong);border-radius:999px;border:2px solid transparent;background-clip:padding-box}',
      '.template-picker-scroll::-webkit-scrollbar-track,.template-modal-body::-webkit-scrollbar-track{background:transparent}',
      '.template-modal-body{flex-direction:column;gap:12px;display:flex;padding:12px 14px}',

      // 底栏
      '.template-picker-foot{flex-shrink:0;display:flex;justify-content:center;align-items:center;gap:6px;padding:9px 14px 11px;position:relative}',
      '.template-picker-foot::before{content:"";position:absolute;left:14px;right:14px;top:0;height:1px;background:linear-gradient(to right,transparent,var(--lg-hairline),transparent)}',
      '.template-modal-actions{flex-shrink:0;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;padding:10px 14px 8px;position:relative;border-top:none}',
      '.template-modal-actions::before{content:"";position:absolute;left:14px;right:14px;top:0;height:1px;background:linear-gradient(to right,transparent,var(--lg-hairline),transparent)}',
      '.template-modal-actions-left,.template-modal-actions-right{flex-wrap:wrap;align-items:center;gap:8px;display:flex}',

      // ---------- 工具条 / 搜索 / 筛选 ----------
      '.dpt-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:2px 0 0}',
      '.dpt-search{flex:1;min-width:150px;display:flex;align-items:center;gap:7px;padding:7px 11px;border-radius:var(--lg-r-control);border:1px solid var(--lg-hairline);background:var(--lg-control-fill);box-shadow:inset 0 1px 0 var(--lg-edge-card-top);transition:border-color var(--lg-dur) var(--lg-ease),box-shadow var(--lg-dur) var(--lg-ease),background var(--lg-dur) var(--lg-ease)}',
      '.dpt-search:focus-within{border-color:color-mix(in srgb,var(--lg-accent) 55%,transparent);box-shadow:0 0 0 3px var(--lg-accent-soft)}',
      '.dpt-search input{flex:1;min-width:0;border:none;outline:none;background:transparent;color:var(--lg-text);font-size:12.5px;font-family:inherit}',
      '.dpt-search input::placeholder{color:var(--lg-text-faint)}',
      '.dpt-search svg{flex:none;color:var(--lg-text-faint)}',
      '.dpt-search-clear{flex:none;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:none;border-radius:50%;background:transparent;color:var(--lg-text-faint);cursor:pointer;transition:background var(--lg-dur) var(--lg-ease),color var(--lg-dur) var(--lg-ease)}',
      '.dpt-search-clear:hover{background:var(--lg-card-bg-hover);color:var(--lg-text)}',
      '.dpt-count{flex:none;font-size:11px;color:var(--lg-text-faint);padding:0 8px;line-height:20px;border-radius:999px;background:var(--lg-card-bg);border:1px solid color-mix(in srgb, var(--lg-hairline) 70%, transparent);white-space:nowrap}',
      '.dpt-filter{font-size:12px;border:1px solid var(--lg-hairline);background:var(--lg-input-bg);color:var(--lg-text-dim);border-radius:var(--lg-r-control);padding:6px 9px;font-family:inherit;cursor:pointer;max-width:150px;outline:none;transition:border-color var(--lg-dur) var(--lg-ease)}',
      '.dpt-filter:hover{border-color:var(--lg-hairline-strong);color:var(--lg-text)}',

      // ---------- 分组 ----------
      '.dpt-group{margin:0 0 4px;border-radius:var(--lg-r-inner);background:transparent;border:1px solid transparent;padding:0;transition:background 240ms var(--lg-ease),border-color 240ms var(--lg-ease)}',
      '.dpt-group[data-open="true"]{background:var(--lg-group-fill);border-color:transparent;padding:2px}',
      '.dpt-group:last-child{margin-bottom:0}',
      '.dpt-group[data-open="true"]{background:var(--lg-group-bg);border-color:color-mix(in srgb, var(--lg-hairline) 45%, transparent);padding:2px}',
      '.dpt-group:last-child{margin-bottom:0}',
      '.dpt-group-head{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:9px 10px;border:none;background:transparent;color:var(--lg-text);cursor:pointer;border-radius:var(--lg-r-control);font-family:inherit;text-align:left;transition:background var(--lg-dur) var(--lg-ease)}',
      '.dpt-group-head:hover{background:var(--lg-card-bg-hover)}',
      '.dpt-group-caret{flex:none;width:14px;display:inline-flex;justify-content:center;color:var(--lg-text-faint);transition:transform 200ms var(--lg-ease)}',
      '.dpt-group-caret[data-open="true"]{transform:rotate(90deg)}',
      '.dpt-group-icon{flex:none;font-size:14px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:8px;background:var(--lg-card-bg);border:1px solid var(--lg-hairline)}',
      '.dpt-group-name{font-size:12.5px;font-weight:620;color:var(--lg-text);letter-spacing:-.005em}',
      '.dpt-group-count{font-size:11px;color:var(--lg-text-faint);background:var(--lg-card-bg);border:1px solid var(--lg-hairline);border-radius:999px;padding:0 7px;line-height:17px}',
      '.dpt-group-spacer{flex:1}',
      '.dpt-group-ops{font-size:11px;color:var(--lg-text-faint);padding:3px 8px;border-radius:var(--lg-r-chip);cursor:pointer;opacity:0;transition:opacity var(--lg-dur) var(--lg-ease),background var(--lg-dur) var(--lg-ease),color var(--lg-dur) var(--lg-ease)}',
      '.dpt-group-head:hover .dpt-group-ops{opacity:1}',
      '.dpt-group-ops:hover{background:var(--lg-accent-soft);color:var(--lg-accent)}',
      '.dpt-group-body{padding:6px 4px 10px}',
      '.dpt-group-empty{font-size:11.5px;color:var(--lg-text-faint);padding:10px 12px;border:1px dashed var(--lg-hairline-strong);border-radius:var(--lg-r-control);text-align:center}',

      // ---------- 卡片（内层轻玻璃） ----------
      '.empty-templates-grid,.template-picker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;width:100%;box-sizing:border-box}',
      '.template-picker-grid>*,.empty-templates-grid>*{min-width:0}',
      '.empty-template{position:relative;display:flex;align-items:flex-start;gap:10px;min-width:0;box-sizing:border-box;padding:12px 13px;text-align:left;font-family:inherit;cursor:pointer;color:var(--lg-text-dim);border-radius:var(--lg-r-card);border:1px solid var(--lg-hairline);background:var(--lg-card-fill);box-shadow:inset 0 1px 0 var(--lg-edge-card-top),var(--lg-shadow-card);transition:transform var(--lg-dur) var(--lg-ease),background var(--lg-dur) var(--lg-ease),border-color var(--lg-dur) var(--lg-ease),box-shadow var(--lg-dur) var(--lg-ease)}',
      '.empty-template:hover{transform:translateY(-2px);background:var(--lg-card-fill-hover);border-color:color-mix(in srgb,var(--lg-accent) 24%,var(--lg-hairline));box-shadow:inset 0 1px 0 color-mix(in srgb,#ffffff 36%,transparent),var(--lg-shadow-card-hover)}',
      '.empty-template:active{transform:translateY(-1px) scale(.985);transition-duration:120ms}',
      '.empty-template:focus-visible{outline:2px solid color-mix(in srgb,var(--lg-accent) 60%,transparent);outline-offset:2px}',
      '.empty-template.add{border-style:dashed;background:color-mix(in srgb,var(--lg-card-bg) 60%,transparent)}',
      '.empty-template.add:hover{border-color:color-mix(in srgb,var(--lg-accent) 55%,transparent)}',
      '.empty-template-icon{flex-shrink:0;font-size:17px;line-height:1.5;display:inline-flex;align-items:center;justify-content:center}',
      '.empty-template.add .empty-template-icon{width:22px;height:22px;border-radius:8px;color:var(--lg-text-faint);background:var(--lg-input-bg);border:1px solid var(--lg-hairline)}',
      '.empty-template-main{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;overflow:hidden}',
      '.empty-template-title{color:var(--lg-text);font-size:13px;font-weight:600;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.empty-template-desc{color:var(--lg-text-faint);font-size:11.5px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.dpt-card-meta{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}',
      '.dpt-chip{font-size:10.5px;line-height:17px;padding:0 7px;border-radius:var(--lg-r-chip);background:var(--lg-input-bg);border:1px solid var(--lg-hairline);color:var(--lg-text-faint);white-space:nowrap}',
      '.dpt-chip-cat{color:var(--lg-accent);background:var(--lg-accent-soft);border-color:color-mix(in srgb,var(--lg-accent) 26%,transparent)}',
      '.dpt-card-ops{position:absolute;top:8px;right:8px;display:flex;gap:2px;opacity:.22;transition:opacity var(--lg-dur) var(--lg-ease)}',
      '.empty-template:hover .dpt-card-ops,.empty-template:focus-within .dpt-card-ops{opacity:1}',
      '.template-card-ops{width:22px;height:22px;flex:none;display:inline-flex;align-items:center;justify-content:center;padding:0;border:none;border-radius:8px;background:transparent;color:var(--lg-text-faint);cursor:pointer;transition:background var(--lg-dur) var(--lg-ease),color var(--lg-dur) var(--lg-ease),transform 140ms var(--lg-ease)}',
      '.template-card-ops:hover{background:var(--lg-accent-soft);color:var(--lg-accent)}',
      '.template-card-ops:active{transform:scale(.88)}',
      '.template-card-ops.is-on{color:var(--lg-accent);opacity:1}',
      '.empty-template:hover .template-card-ops.is-on{opacity:1}',

      // ---------- 表单 ----------
      '.template-field{display:flex;flex-direction:column;gap:6px}',
      '.template-field-label{color:var(--lg-text-dim);font-size:11.5px;font-weight:600;letter-spacing:.01em}',
      '.template-field-input{width:100%;box-sizing:border-box;padding:8px 11px;font-size:13px;font-family:inherit;color:var(--lg-text);background:var(--lg-control-bg);border:1px solid var(--lg-hairline);border-radius:var(--lg-r-control);outline:none;box-shadow:inset 0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);transition:border-color var(--lg-dur) var(--lg-ease),box-shadow var(--lg-dur) var(--lg-ease),background var(--lg-dur) var(--lg-ease)}',
      '.template-field-input:hover{border-color:var(--lg-hairline-strong)}',
      '.template-field-input:focus{border-color:color-mix(in srgb,var(--lg-accent) 55%,transparent);box-shadow:0 0 0 3px var(--lg-accent-soft);background:var(--lg-card-bg)}',
      '.template-field-input.icon{width:66px;text-align:center;font-size:16px}',
      '.template-field-prompt{min-height:96px;padding:10px 11px;font-size:13px;line-height:1.6;font-family:inherit;color:var(--lg-text);background:var(--lg-control-bg);border:1px solid var(--lg-hairline);border-radius:var(--lg-r-control);outline:none;resize:none;overflow:hidden;box-shadow:inset 0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-base) 30%, transparent);transition:border-color var(--lg-dur) var(--lg-ease),box-shadow var(--lg-dur) var(--lg-ease),background var(--lg-dur) var(--lg-ease)}',
      '.template-field-prompt:focus{border-color:color-mix(in srgb,var(--lg-accent) 55%,transparent);box-shadow:0 0 0 3px var(--lg-accent-soft);background:var(--lg-card-bg)}',
      '.template-error{flex-shrink:0;font-size:12px;color:var(--lg-danger);padding:6px 10px;border-radius:var(--lg-r-chip);background:color-mix(in srgb,var(--lg-danger) 12%,transparent)}',
      '.dpt-row{display:flex;gap:8px;align-items:center}',
      '.dpt-select{flex:1;min-width:0}',

      // ---------- 按钮 ----------
      '.template-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 13px;font-size:12.5px;font-family:inherit;font-weight:520;color:var(--lg-text-dim);background:var(--lg-control-bg);border-top:1px solid var(--lg-edge-card-top);border-bottom:1px solid var(--lg-hairline);border-left:1px solid var(--lg-edge-card-side);border-right:1px solid var(--lg-edge-card-side);border-radius:var(--lg-r-control);cursor:pointer;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.05), inset 0 1px 0 color-mix(in srgb, #ffffff 16%, transparent);transition:background var(--lg-dur) var(--lg-ease),border-color var(--lg-dur) var(--lg-ease),color var(--lg-dur) var(--lg-ease),transform 140ms var(--lg-ease),box-shadow var(--lg-dur) var(--lg-ease)}',
      '.template-btn:hover{background:var(--lg-card-bg-hover);border-color:var(--lg-hairline-strong);color:var(--lg-text)}',
      '.template-btn:active{transform:scale(.97)}',
      '.template-btn[disabled]{opacity:.45;cursor:default;transform:none}',
      '.template-btn.ghost{background:transparent;border-color:transparent}',
      '.template-btn.ghost:hover{background:var(--lg-card-bg-hover);border-color:var(--lg-hairline)}',
      '.template-btn.ghost.danger{color:var(--lg-danger)}',
      '.template-btn.ghost.danger:hover{background:color-mix(in srgb,var(--lg-danger) 12%,transparent);border-color:color-mix(in srgb,var(--lg-danger) 34%,transparent)}',
      '.template-btn.fill{color:var(--lg-accent);background:var(--lg-accent-soft);border-color:color-mix(in srgb,var(--lg-accent) 40%,transparent)}',
      '.template-btn.fill:hover{background:color-mix(in srgb,var(--lg-accent) 22%,transparent);border-color:color-mix(in srgb,var(--lg-accent) 58%,transparent)}',
      '.template-btn.send{color:color-mix(in srgb,var(--dsw-alias-bg-base) 92%,#fff);background:var(--lg-accent);border-color:transparent;font-weight:600}',
      '.template-btn.send:hover{filter:brightness(1.08);box-shadow:0 0 0 3px var(--lg-accent-soft)}',
      '.empty-templates-reset{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;font-size:11.5px;font-family:inherit;color:var(--lg-text-faint);background:transparent;border:1px solid transparent;border-radius:var(--lg-r-control);cursor:pointer;transition:background var(--lg-dur) var(--lg-ease),color var(--lg-dur) var(--lg-ease),border-color var(--lg-dur) var(--lg-ease)}',
      '.empty-templates-reset:hover{background:var(--lg-card-bg-hover);border-color:var(--lg-hairline);color:var(--lg-text-dim)}',
      '.empty-templates-reset:active{transform:scale(.97)}',

      // ---------- 分类管理 / 建议列表 ----------
      '.dpt-cat-row{padding:8px 0;border-bottom:1px solid var(--lg-hairline)}',
      '.dpt-cat-row:last-child{border-bottom:none}',
      '.dpt-cat-name{font-size:12.5px;font-weight:600;color:var(--lg-text)}',
      '.dpt-cat-remove{display:flex;flex-direction:column;gap:8px;padding:10px;margin-top:6px;font-size:11.5px;color:var(--lg-text-dim);background:var(--lg-input-bg);border:1px solid var(--lg-hairline);border-radius:var(--lg-r-control)}',
      '.dpt-suggest{display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;padding:2px;scrollbar-width:thin}',
      '.dpt-suggest-row{display:flex;align-items:center;gap:8px;font-size:12px;padding:8px 10px;border:1px solid var(--lg-hairline);border-radius:var(--lg-r-control);background:var(--lg-card-bg);transition:background var(--lg-dur) var(--lg-ease),border-color var(--lg-dur) var(--lg-ease)}',
      '.dpt-suggest-row:hover{background:var(--lg-card-bg-hover);border-color:var(--lg-hairline-strong)}',
      '.dpt-suggest-row input{flex:none;accent-color:var(--lg-accent)}',
      '.dpt-empty-hint{padding:22px 16px;text-align:center;color:var(--lg-text-faint);font-size:12px}',
      '.empty-templates{width:min(720px,100%);margin-top:0}',
      '.empty-templates-head{flex-wrap:wrap;justify-content:center;align-items:baseline;gap:10px;margin-bottom:12px;display:flex}',
      '.empty-templates-title{color:var(--lg-text);font-size:14px;font-weight:640}',
      '.empty-templates-hint{color:var(--lg-text-faint);font-size:11.5px}',
      '.empty-templates-foot{justify-content:center;margin-top:10px;display:flex}',

      // ---------- 降级：不支持 backdrop-filter 时用更实的底色保证可读 ----------
      '@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){',
      '  .modal::before{background:var(--dsw-alias-bg-overlay);border-color:var(--lg-hairline)}',
      '  .empty-template{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 88%, transparent)}',
      '  .dpt-group{background:color-mix(in srgb, var(--dsw-alias-bg-base) 70%, transparent)}',
      '}',

      // ---------- 减少动效偏好 ----------

      // ---------- 深色主题：环境光更冷、边缘高光减弱 ----------
      'body[data-ds-dark-theme] .dpt-overlay{--lg-aur-1:color-mix(in srgb,#4f7fbe 26%,transparent);--lg-aur-2:color-mix(in srgb,#7a6ba8 20%,transparent);--lg-aur-3:color-mix(in srgb,#3f8f96 18%,transparent);--lg-edge-top:color-mix(in srgb,#ffffff 16%,transparent);--lg-edge-side:color-mix(in srgb,#ffffff 7%,transparent);--lg-edge-card-top:color-mix(in srgb,#ffffff 10%,transparent);--lg-edge-bottom:color-mix(in srgb,#000000 30%,transparent)}',

      // ---------- 渐进增强：squircle 连续曲率（Chrome 139+）----------
      '@supports (corner-shape:round){',
      '  .modal,.modal::before,.modal::after{corner-shape:round}',
      '  .empty-template{corner-shape:round}',
      '  .dpt-search,.dpt-filter,.template-btn,.template-field-input,.template-field-prompt{corner-shape:round}',
      '}',

      '@media (prefers-reduced-motion:reduce){',
      '  .modal,.dpt-overlay{animation:none}',
      '  .empty-template,.template-btn,.template-card-ops,.dpt-trigger{transition:none}',
      '  .empty-template:hover{transform:none}',
      '}',
    ]

    var PI_CSS = ['.dpt-overlay{' + CSS_VARS + '}', CSS_RULES.join('\n')].join('\n')

    // 主题变量已在 PI_CSS 的 .dpt-overlay 作用域内定义（--lg-*），
    // 这里保留一个空实现，避免各处 style={themeStyle()} 调用处改动。
    function themeStyle(extra) {
      return extra || undefined
    }

    // ---------------------------------------------------------------- utils
    function randomId() {
      try {
        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID()
      } catch (error) {
        /* ignore */
      }
      return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    }

    function normalizeTemplateCommand(value) {
      return String(value || '')
        .trim()
        .replace(/^\//, '')
        .toLowerCase()
    }
    function validTemplateCommand(value) {
      return /^[a-z][a-z0-9_-]*$/.test(value)
    }

    // ---------------------------------------------------------------- store
    var store = {
      items: null,
      builtin: [],
      categories: [],
      ui: { collapsed: {} },
      error: '',
      pending: false,
      revision: 0,
      subs: new Set(),
      emit: function () {
        this.revision++
        this.subs.forEach(function (fn) { fn() })
      },
      setAll: function (payload) {
        var data = payload || {}
        if (Array.isArray(data.items)) this.items = data.items
        if (Array.isArray(data.builtin)) this.builtin = data.builtin
        if (Array.isArray(data.builtinCategories)) this.builtinCategories = data.builtinCategories
        if (Array.isArray(data.categories)) this.categories = data.categories
        if (data.ui && typeof data.ui === 'object') this.ui = data.ui
        this.error = ''
        this.emit()
      },
      setError: function (message) {
        this.error = message
        this.emit()
      },
    }

    function mutate(body) {
      if (store.pending) return Promise.resolve(false)
      store.pending = true
      return fetch('/__prompt-templates/mutate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) throw new Error((data && data.error) || response.statusText)
            if (!Array.isArray(data.items)) throw new Error('Invalid prompt templates response')
            store.setAll(data)
            return true
          })
        })
        .catch(function (error) {
          store.setError(String((error && error.message) || error))
          return false
        })
        .then(function (ok) {
          store.pending = false
          return ok
        })
    }

    function refresh() {
      if (store.pending) return
      fetch('/__prompt-templates/list')
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) throw new Error((data && data.error) || response.statusText)
            if (!Array.isArray(data.items)) throw new Error('Invalid prompt templates response')
            store.setAll(data)
          })
        })
        .catch(function (error) {
          store.setError(String((error && error.message) || error))
        })
    }

    function useStore() {
      var force = React.useState(0)[1]
      React.useEffect(function () {
        var fn = function () { force(function (n) { return n + 1 }) }
        store.subs.add(fn)
        return function () { store.subs.delete(fn) }
      }, [])
    }

    /** 有效模板 = 内置（未移出，应用覆盖）+ 自定义。 */
    function computeTemplates(items, builtin) {
      var overrides = new Map()
      var hidden = new Set()
      var builtinIds = new Set(builtin.map(function (b) { return b.id }))
      ;(items || []).forEach(function (entry) {
        if (!entry || typeof entry.id !== 'string') return
        if (entry.hidden) hidden.add(entry.id)
        else if (typeof entry.title === 'string') overrides.set(entry.id, entry)
      })
      var zh = currentDict() === ZH
      var built = builtin
        .filter(function (d) { return !hidden.has(d.id) })
        .map(function (d) {
          var o = overrides.get(d.id)
          return {
            id: d.id,
            icon: (o && o.icon) || d.icon || '📌',
            title: (o && o.title) || (zh ? d.title : d.titleEn || d.title),
            desc: (o && o.desc) || (zh ? d.desc : d.descEn || d.desc),
            command: (o && typeof o.command === 'string' && o.command) || '',
            prompt: (o && o.prompt) || (zh ? d.prompt : d.promptEn || d.prompt),
            category: (o && o.category) || d.category || '',
            tags: (o && o.tags) || d.tags || [],
            favorite: !!(o && o.favorite),
            builtin: true,
          }
        })
      var extras = (items || [])
        .filter(function (entry) {
          return entry && !entry.hidden && typeof entry.title === 'string' && !builtinIds.has(entry.id)
        })
        .map(function (entry) {
          return {
            id: entry.id,
            icon: entry.icon || '📌',
            title: entry.title,
            desc: entry.desc || '',
            command: typeof entry.command === 'string' ? entry.command : '',
            prompt: entry.prompt || '',
            category: entry.category || '',
            tags: Array.isArray(entry.tags) ? entry.tags : [],
            favorite: entry.favorite === true,
          }
        })
      return built.concat(extras)
    }

    /** 已排序的分类列表；「未分类」不是分类，单独处理。 */
    function sortedCategories(categories) {
      return (categories || [])
        .slice()
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0) })
    }

    function matchesQuery(tpl, query, categoryName) {
      if (!query) return true
      var hay = [
        tpl.title,
        tpl.desc,
        tpl.prompt,
        categoryName || '',
        (tpl.tags || []).join(' '),
      ]
        .join('\n')
        .toLowerCase()
      return hay.indexOf(query) >= 0
    }

    // ---------------------------------------------------------------- 触发按钮
    function Trigger(props) {
      useStore()
      var open = props.__panel && props.__panel.isOpen()
      return h(
        'button',
        {
          type: 'button',
          className: 'dpt-trigger',
          title: t('tpl.openPicker'),
          'aria-label': t('tpl.openPicker'),
          'data-active': open ? 'true' : 'false',
          onClick: function () {
            if (store.items === null) refresh()
            props.__panel.open()
          },
        },
        h(GridIcon, null),
      )
    }

    // 浮层容器：按 composer 之上的实际剩余空间限制自身高度；
    // 同时把光标位置写入 --lg-px/--lg-py，供玻璃表面的镜面反光使用。
    function Overlay(props) {
      var ref = React.useRef(null)
      React.useEffect(function () {
        var el = ref.current
        if (!el) return

        function applyRoom() {
          var anchor = el.parentElement
          var top = window.innerHeight * 0.45
          if (anchor) {
            var rect = anchor.getBoundingClientRect()
            if (rect && rect.top > 0) top = rect.top
          }
          var room = Math.max(240, Math.min(top - 20, window.innerHeight * 0.78))
          el.style.setProperty('--dpt-room', Math.round(room) + 'px')
        }
        applyRoom()

        // 光标反光：仅精确指针设备；rAF 节流；离开/停止时回到中性位置
        var fine = true
        try {
          fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches
        } catch (e) {
          fine = false
        }
        var pending = null
        var frame = 0

        function flush() {
          frame = 0
          if (pending === null) return
          var box = el.getBoundingClientRect()
          if (!box.width || !box.height) return
          var px = ((pending.x - box.left) / box.width) * 100
          var py = ((pending.y - box.top) / box.height) * 100
          el.style.setProperty('--lg-px', Math.max(-10, Math.min(110, px)).toFixed(1) + '%')
          el.style.setProperty('--lg-py', Math.max(-10, Math.min(110, py)).toFixed(1) + '%')
          pending = null
        }

        function onMove(event) {
          if (!fine || event.pointerType === 'touch') return
          pending = { x: event.clientX, y: event.clientY }
          if (!frame) frame = window.requestAnimationFrame(flush)
        }

        function onLeave() {
          if (frame) {
            window.cancelAnimationFrame(frame)
            frame = 0
          }
          pending = null
          el.style.setProperty('--lg-px', '50%')
          el.style.setProperty('--lg-py', '0%')
        }

        el.addEventListener('pointermove', onMove, { passive: true })
        el.addEventListener('pointerleave', onLeave, { passive: true })
        window.addEventListener('resize', applyRoom)

        return function () {
          el.removeEventListener('pointermove', onMove)
          el.removeEventListener('pointerleave', onLeave)
          window.removeEventListener('resize', applyRoom)
          if (frame) window.cancelAnimationFrame(frame)
        }
      }, [])

      return h('div', { className: 'dpt-overlay', style: themeStyle(), ref: ref }, props.children)
    }

    // ---------------------------------------------------------------- 卡片
    function TemplateCard(props) {
      var tpl = props.tpl
      var tags = (tpl.tags || []).slice(0, 3)
      return h(
        'button',
        {
          type: 'button',
          className: 'empty-template',
          title: props.title || t('tpl.clickCard'),
          onClick: props.onFill,
        },
        h('span', { className: 'empty-template-icon' }, tpl.icon),
        h(
          'span',
          { className: 'empty-template-main' },
          h('span', { className: 'empty-template-title' }, tpl.title),
          h('span', { className: 'empty-template-desc' }, tpl.desc),
          (props.showCategory || tags.length > 0) &&
            h(
              'span',
              { className: 'dpt-card-meta' },
              // 搜索结果里保留所属分类，避免不知道模板原本在哪
              props.showCategory && props.categoryName
                ? h('span', { className: 'dpt-chip dpt-chip-cat' }, props.categoryName)
                : null,
              tags.map(function (tag) {
                return h('span', { className: 'dpt-chip', key: tag }, tag)
              }),
            ),
        ),
        h(
          'span',
          { className: 'dpt-card-ops' },
          h(
            'span',
            {
              className: 'template-card-ops' + (tpl.favorite ? ' is-on' : ''),
              role: 'button',
              title: tpl.favorite ? t('tpl.unfavorite') : t('tpl.favorite'),
              onClick: function (event) {
                event.stopPropagation()
                props.onToggleFavorite()
              },
            },
            h(FiStar, null),
          ),
          h(
            'span',
            {
              className: 'template-card-ops',
              role: 'button',
              title: props.editTitle || t('tpl.editTpl'),
              onClick: function (event) {
                event.stopPropagation()
                props.onEdit()
              },
            },
            h(FiEdit2, null),
          ),
        ),
      )
    }

    function AddCard(props) {
      return h(
        'button',
        { type: 'button', className: 'empty-template add', onClick: props.onNew, title: t('tpl.add') },
        h('span', { className: 'empty-template-icon' }, h(FiPlus, null)),
        h(
          'span',
          { className: 'empty-template-main' },
          h('span', { className: 'empty-template-title' }, t('tpl.add')),
          h('span', { className: 'empty-template-desc' }, t('tpl.addDesc')),
        ),
      )
    }

    // ---------------------------------------------------------------- 选择器弹窗
    function PickerModal(props) {
      React.useEffect(function () {
        var onKey = function (event) {
          if (event.key === 'Escape') props.onClose()
        }
        window.addEventListener('keydown', onKey)
        return function () { window.removeEventListener('keydown', onKey) }
      }, [props.onClose])

      var searchState = React.useState('')
      var query = searchState[0], setQuery = searchState[1]
      var filterState = React.useState('all')
      var filter = filterState[0], setFilter = filterState[1]

      var categories = props.categories
      var categoryNameById = {}
      categories.forEach(function (category) { categoryNameById[category.id] = category.name })

      // 所有出现过的标签，供统一筛选入口使用
      var allTags = []
      props.templates.forEach(function (tpl) {
        (tpl.tags || []).forEach(function (tag) {
          if (allTags.indexOf(tag) < 0) allTags.push(tag)
        })
      })
      allTags.sort()

      var q = query.trim().toLowerCase()
      var tagFilter = filter.indexOf('tag:') === 0 ? filter.slice(4) : ''
      var visible = props.templates.filter(function (tpl) {
        if (filter === 'favorite' && !tpl.favorite) return false
        if (filter === 'uncategorized' && tpl.category) return false
        if (tagFilter && (tpl.tags || []).indexOf(tagFilter) < 0) return false
        if (filter !== 'all' && filter !== 'favorite' && filter !== 'uncategorized' && !tagFilter) {
          if (tpl.category !== filter) return false
        }
        return matchesQuery(tpl, q, categoryNameById[tpl.category] || (tpl.category ? '' : t('tpl.uncategorized')))
      })

      // 搜索或筛选时强制展开，便于直接看到结果
      var forcedOpen = q !== '' || filter !== 'all'

      var groups = categories
        .map(function (category) {
          var list = visible.filter(function (tpl) { return tpl.category === category.id })
          return { category: category, templates: list }
        })
        .filter(function (group) {
          if (group.templates.length) return true
          // 空分类：有搜索/筛选时不显示，否则显示简洁空状态
          return !forcedOpen && filter === 'all'
        })

      var uncategorized = visible.filter(function (tpl) { return !tpl.category })
      if (uncategorized.length) {
        groups.push({
          category: { id: '', name: t('tpl.uncategorized'), icon: '📦' },
          templates: uncategorized,
        })
      }

      function toggleGroup(id) {
        props.onToggleCollapse(id, !(props.collapsed || {})[id])
      }

      var totalVisible = visible.length

      return h(
        Overlay,
        null,
        h(
          'div',
          { className: 'modal template-picker' },
          h(
            'div',
            { className: 'template-picker-top' },
            h(
              'div',
              { className: 'template-picker-head' },
              h('span', { className: 'template-picker-title' }, t('tpl.pickerTitle')),
              h(
                'button',
                {
                  type: 'button',
                  className: 'btn template-modal-close',
                  title: t('tpl.manageCategories'),
                  onClick: props.onManageCategories,
                },
                h(FiSettings, null),
              ),
              h(
                'button',
                { type: 'button', className: 'btn template-modal-close', title: t('close'), onClick: props.onClose },
                h(FiX, null),
              ),
            ),
            h(
              'div',
              { className: 'dpt-toolbar' },
              h(
                'label',
                { className: 'dpt-search' },
                h(FiSearch, null),
                h('input', {
                  value: query,
                  placeholder: t('tpl.searchPh'),
                  onChange: function (event) { setQuery(event.target.value) },
                }),
                query
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'dpt-search-clear',
                        title: t('tpl.clearSearch'),
                        onClick: function (event) {
                          event.preventDefault()
                          event.stopPropagation()
                          setQuery('')
                        },
                      },
                      h(FiX, null),
                    )
                  : null,
              ),
              h('span', { className: 'dpt-count' }, String(totalVisible) + ' / ' + String(props.templates.length)),
              h(
                'select',
                {
                  className: 'dpt-filter',
                  value: filter,
                  onChange: function (event) { setFilter(event.target.value) },
                  title: t('tpl.filterTitle'),
                },
                h('option', { value: 'all' }, t('tpl.filterAll')),
                h('option', { value: 'favorite' }, t('tpl.filterFavorite')),
                h('option', { value: 'uncategorized' }, t('tpl.uncategorized')),
                categories.map(function (category) {
                  return h('option', { value: category.id, key: category.id }, category.name)
                }),
                allTags.length
                  ? h(
                      'optgroup',
                      { label: t('tpl.filterTags'), key: 'tags' },
                      allTags.map(function (tag) {
                        return h('option', { value: 'tag:' + tag, key: 'tag:' + tag }, '# ' + tag)
                      }),
                    )
                  : null,
              ),
              h(
                'button',
                { type: 'button', className: 'empty-templates-reset', onClick: props.onBatchClassify, title: t('tpl.batchTip') },
                t('tpl.batch'),
              ),
            ),
            h(
              'div',
              { className: 'template-picker-hint' },
              forcedOpen
                ? t('tpl.searchResult').replace('{n}', String(totalVisible))
                : t('tpl.pickerHint'),
            ),
          ),
          h(
            'div',
            { className: 'template-picker-scroll' },
            groups.length === 0
              ? h('div', { className: 'dpt-empty-hint' }, t('tpl.noMatch'))
              : groups.map(function (group) {
                  var id = group.category.id || '__none__'
                  var isOpen = forcedOpen || !(props.collapsed || {})[id]
                  return h(
                    'div',
                    { className: 'dpt-group', key: id, 'data-open': isOpen ? 'true' : 'false' },
                    h(
                      'div',
                      {
                        className: 'dpt-group-head',
                        role: 'button',
                        tabIndex: 0,
                        onClick: function () { if (!forcedOpen) toggleGroup(id) },
                      },
                      h('span', { className: 'dpt-group-caret', 'data-open': isOpen ? 'true' : 'false' }, h(FiChevron, null)),
                      group.category.icon ? h('span', { className: 'dpt-group-icon' }, group.category.icon) : null,
                      h('span', { className: 'dpt-group-name' }, group.category.name),
                      h('span', { className: 'dpt-group-count' }, String(group.templates.length)),
                      h('span', { className: 'dpt-group-spacer' }),
                      group.category.id
                        ? h(
                            'span',
                            {
                              className: 'dpt-group-ops',
                              role: 'button',
                              title: t('tpl.manageCategories'),
                              onClick: function (event) {
                                event.stopPropagation()
                                props.onManageCategories()
                              },
                            },
                            t('tpl.manage'),
                          )
                        : null,
                    ),
                    isOpen
                      ? h(
                          'div',
                          { className: 'dpt-group-body' },
                          group.templates.length === 0
                            ? h('div', { className: 'dpt-group-empty' }, t('tpl.groupEmpty'))
                            : h(
                                'div',
                                { className: 'template-picker-grid' },
                                group.templates.map(function (tpl) {
                                  return h(TemplateCard, {
                                    key: tpl.id,
                                    tpl: tpl,
                                    title: t('tpl.clickCard'),
                                    showCategory: !!q || filter === 'favorite',
                                    categoryName: tpl.category ? categoryNameById[tpl.category] : '',
                                    onFill: function () { props.onFill(tpl) },
                                    onEdit: function () { props.onEditTpl(tpl) },
                                    onToggleFavorite: function () { props.onToggleFavorite(tpl) },
                                  })
                                }),
                              ),
                        )
                      : null,
                  )
                }),
          ),
          h(
            'div',
            { className: 'template-picker-foot' },
            h(
              'button',
              {
                type: 'button',
                className: 'template-btn fill',
                onClick: function () { props.onNew(visible.length ? categories[0] && categories[0].id : undefined) },
              },
              h(FiPlus, null),
              t('tpl.add'),
            ),
            h(
              'button',
              { type: 'button', className: 'empty-templates-reset', onClick: props.onResetToggle },
              h(FiRotateCcw, null),
              props.resetConfirm ? t('tpl.resetConfirm') : t('tpl.reset'),
            ),
          ),
        ),
      )
    }

    // ---------------------------------------------------------------- 编辑弹窗
    function EditModal(props) {
      var editing = props.editing
      var taRef = React.useRef(null)

      React.useEffect(function () {
        var onKey = function (event) {
          if (event.key === 'Escape') props.onClose()
        }
        window.addEventListener('keydown', onKey)
        return function () { window.removeEventListener('keydown', onKey) }
      }, [props.onClose])

      React.useEffect(
        function () {
          var ta = taRef.current
          if (!ta) return
          ta.style.height = 'auto'
          var capped = ta.scrollHeight > 300
          ta.style.height = Math.min(ta.scrollHeight, 300) + 'px'
          ta.style.overflowY = capped ? 'auto' : 'hidden'
        },
        [editing.prompt],
      )

      function save() {
        var title = String(editing.title || '').trim()
        var prompt = String(editing.prompt || '').trim()
        if (!title || !prompt) return props.onDraft(Object.assign({}, editing, { error: t('tpl.required') }))
        var command = normalizeTemplateCommand(editing.command || '')
        if (command && !validTemplateCommand(command)) {
          return props.onDraft(Object.assign({}, editing, { error: t('tpl.commandInvalid') }))
        }
        if (
          command &&
          props.templates.some(function (tpl) {
            return tpl.id !== editing.id && normalizeTemplateCommand(tpl.command || '') === command
          })
        ) {
          return props.onDraft(Object.assign({}, editing, { error: t('tpl.commandDuplicate') }))
        }
        props.onSave({
          id: editing.id,
          command: command,
          icon: String(editing.icon || '').trim() || '📌',
          title: title,
          desc: String(editing.desc || '').trim(),
          prompt: prompt,
        })
      }

      var isBuiltin = !!editing.builtin && !props.isNew

      return h(
        Overlay,
        null,
        h(
          'div',
          { className: 'modal template-modal' },
          h(
            'div',
            { className: 'template-modal-head' },
            h('span', { className: 'template-modal-icon' }, editing.icon),
            h('span', { className: 'template-modal-badge' }, isBuiltin ? t('tpl.builtin') : t('tpl.custom')),
            h('span', { className: 'template-modal-title' }, props.isNew ? t('tpl.newTitle') : t('tpl.editTitle')),
            h(
              'button',
              { type: 'button', className: 'btn template-modal-close', title: t('close'), onClick: props.onClose },
              h(FiX, null),
            ),
          ),
          h(
            'div',
            { className: 'template-modal-body' },
            h(
              'label',
              { className: 'template-field' },
              h('span', { className: 'template-field-label' }, t('tpl.fieldIcon')),
              h('input', {
                className: 'template-field-input icon',
                value: editing.icon || '',
                maxLength: 4,
                onChange: function (event) {
                  props.onDraft(Object.assign({}, editing, { icon: event.target.value }))
                },
              }),
            ),
            h(
              'label',
              { className: 'template-field' },
              h('span', { className: 'template-field-label' }, t('tpl.fieldTitle')),
              h('input', {
                className: 'template-field-input',
                value: editing.title || '',
                placeholder: t('tpl.fieldTitlePh'),
                onChange: function (event) {
                  props.onDraft(Object.assign({}, editing, { title: event.target.value }))
                },
              }),
            ),
            h(
              'label',
              { className: 'template-field' },
              h('span', { className: 'template-field-label' }, t('tpl.fieldDesc')),
              h('input', {
                className: 'template-field-input',
                value: editing.desc || '',
                placeholder: t('tpl.fieldDescPh'),
                onChange: function (event) {
                  props.onDraft(Object.assign({}, editing, { desc: event.target.value }))
                },
              }),
            ),
            // 所属分类 + 智能识别
            h(
              'label',
              { className: 'template-field' },
              h('span', { className: 'template-field-label' }, t('tpl.fieldCategory')),
              h(
                'div',
                { className: 'dpt-row' },
                h(
                  'select',
                  {
                    className: 'template-field-input dpt-select',
                    value: editing.category || '',
                    onChange: function (event) {
                      props.onDraft(Object.assign({}, editing, { category: event.target.value }))
                    },
                  },
                  h('option', { value: '' }, t('tpl.uncategorized')),
                  props.categories.map(function (category) {
                    return h('option', { value: category.id, key: category.id }, category.name)
                  }),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'btn template-btn',
                    onClick: props.onSuggest,
                    title: t('tpl.smartTip'),
                    disabled: props.suggesting,
                  },
                  props.suggesting ? t('tpl.smartRunning') : t('tpl.smart'),
                ),
              ),
              h('span', { className: 'template-picker-hint' }, t('tpl.fieldCategoryHint')),
            ),
            h(
              'label',
              { className: 'template-field' },
              h('span', { className: 'template-field-label' }, t('tpl.fieldTags')),
              h('input', {
                className: 'template-field-input',
                value: Array.isArray(editing.tags) ? editing.tags.join(', ') : '',
                placeholder: t('tpl.fieldTagsPh'),
                onChange: function (event) {
                  props.onDraft(
                    Object.assign({}, editing, {
                      tags: event.target.value
                        .split(/[,，;；]/)
                        .map(function (tag) { return tag.trim() })
                        .filter(Boolean),
                    }),
                  )
                },
              }),
            ),
            h(
              'label',
              { className: 'template-field' },
              h('span', { className: 'template-field-label' }, t('tpl.fieldCommand')),
              h('input', {
                className: 'template-field-input',
                value: editing.command || '',
                placeholder: '/pr',
                onChange: function (event) {
                  props.onDraft(Object.assign({}, editing, { command: event.target.value, error: undefined }))
                },
              }),
              h('span', { className: 'template-picker-hint' }, t('tpl.commandHint')),
            ),
            h(
              'label',
              { className: 'template-field' },
              h('span', { className: 'template-field-label' }, t('tpl.fieldPrompt')),
              h('textarea', {
                ref: taRef,
                className: 'template-field-prompt',
                value: editing.prompt || '',
                placeholder: t('tpl.fieldPromptPh'),
                onChange: function (event) {
                  props.onDraft(Object.assign({}, editing, { prompt: event.target.value }))
                },
              }),
            ),
          ),
          editing.error || props.storageError
            ? h(
                'div',
                { className: 'template-error', role: 'alert' },
                editing.error || t('tpl.storageError') + ': ' + props.storageError,
              )
            : null,
          h(
            'div',
            { className: 'template-modal-actions' },
            h(
              'div',
              { className: 'template-modal-actions-left' },
              !props.isNew && isBuiltin && props.hasOverride
                ? h(
                    'button',
                    { type: 'button', className: 'btn template-btn ghost', title: t('tpl.restoreTip'), onClick: props.onRestore },
                    t('tpl.restore'),
                  )
                : null,
              !props.isNew && isBuiltin
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'btn template-btn ghost danger',
                      title: t('tpl.removeTip'),
                      onClick: props.onRemove,
                    },
                    h(FiTrash2, null),
                    ' ' + t('tpl.remove'),
                  )
                : null,
              !props.isNew && !isBuiltin
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'btn template-btn ghost danger',
                      title: t('tpl.deleteTip'),
                      onClick: props.onRemove,
                    },
                    h(FiTrash2, null),
                    ' ' + t('tpl.delete'),
                  )
                : null,
            ),
            h(
              'div',
              { className: 'template-modal-actions-right' },
              h('button', { type: 'button', className: 'btn template-btn', onClick: save }, t('tpl.save')),
              h(
                'button',
                { type: 'button', className: 'btn template-btn fill', onClick: props.onFill, title: t('tpl.fillTip') },
                t('tpl.fill'),
              ),
              h(
                'button',
                { type: 'button', className: 'btn template-btn send', onClick: props.onSend, title: t('tpl.sendTip') },
                h(FiSend, null),
                ' ' + t('tpl.sendNow'),
              ),
            ),
          ),
        ),
      )
    }

    // ---------------------------------------------------------------- 面板主体
    /** 一个面板实例 = 选择器弹窗 + 编辑弹窗状态。 */
    // ---------------------------------------------------------------- 分类管理
    function CategoryManager(props) {
      var categories = props.categories
      var draftState = React.useState(null)
      var draft = draftState[0], setDraft = draftState[1]
      var removingState = React.useState(null)
      var removing = removingState[0], setRemoving = removingState[1]

      function startAdd() {
        setDraft({ id: '', name: '', icon: '🏷️', nameEn: '' })
      }

      function startEdit(category) {
        setDraft({ id: category.id, name: category.name, icon: category.icon || '', nameEn: category.nameEn || '' })
      }

      function commit() {
        if (!draft) return
        var name = String(draft.name || '').trim()
        if (!name) return
        if (draft.id) {
          props.onUpdateCategory(draft.id, { name: name, icon: draft.icon, nameEn: draft.nameEn })
        } else {
          props.onAddCategory({ name: name, icon: draft.icon, nameEn: draft.nameEn })
        }
        setDraft(null)
      }

      function move(index, delta) {
        var order = categories.map(function (category) { return category.id })
        var next = index + delta
        if (next < 0 || next >= order.length) return
        var item = order.splice(index, 1)[0]
        order.splice(next, 0, item)
        props.onReorder(order)
      }

      return h(
        Overlay,
        null,
        h(
          'div',
          { className: 'modal template-modal' },
          h(
            'div',
            { className: 'template-modal-head' },
            h('span', { className: 'template-modal-icon' }, '🗂'),
            h('span', { className: 'template-modal-title' }, t('tpl.manageCategories')),
            h(
              'button',
              { type: 'button', className: 'btn template-modal-close', title: t('tpl.back'), onClick: props.onBack },
              h(FiX, null),
            ),
          ),
          h(
            'div',
            { className: 'template-modal-body' },
            h('div', { className: 'template-picker-hint' }, t('tpl.categoryHint')),
            draft
              ? h(
                  'div',
                  { className: 'template-field' },
                  h(
                    'div',
                    { className: 'dpt-row' },
                    h('input', {
                      className: 'template-field-input',
                      style: { width: 62, flex: 'none', textAlign: 'center' },
                      value: draft.icon || '',
                      maxLength: 4,
                      placeholder: '🏷️',
                      onChange: function (event) { setDraft(Object.assign({}, draft, { icon: event.target.value })) },
                    }),
                    h('input', {
                      className: 'template-field-input',
                      value: draft.name,
                      placeholder: t('tpl.categoryNamePh'),
                      onChange: function (event) { setDraft(Object.assign({}, draft, { name: event.target.value })) },
                      onKeyDown: function (event) { if (event.key === 'Enter') commit() },
                    }),
                  ),
                  h(
                    'div',
                    { className: 'dpt-row' },
                    h('button', { type: 'button', className: 'btn template-btn fill', onClick: commit }, t('tpl.save')),
                    h('button', { type: 'button', className: 'btn template-btn', onClick: function () { setDraft(null) } }, t('tpl.cancel')),
                  ),
                )
              : null,
            categories.map(function (category, index) {
              var count = props.countOf(category.id)
              var isRemoving = removing === category.id
              return h(
                'div',
                { className: 'dpt-cat-row', key: category.id },
                h(
                  'div',
                  { className: 'dpt-row' },
                  h('span', { className: 'dpt-group-icon' }, category.icon || '🏷️'),
                  h('span', { className: 'dpt-cat-name' }, category.name),
                  h('span', { className: 'dpt-group-count' }, String(count)),
                  h('span', { className: 'dpt-group-spacer' }),
                  h(
                    'button',
                    { type: 'button', className: 'template-btn', disabled: index === 0, onClick: function () { move(index, -1) } },
                    '↑',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'template-btn',
                      disabled: index === categories.length - 1,
                      onClick: function () { move(index, 1) },
                    },
                    '↓',
                  ),
                  h('button', { type: 'button', className: 'template-btn', onClick: function () { startEdit(category) } }, t('tpl.edit')),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'template-btn ghost danger',
                      onClick: function () { setRemoving(isRemoving ? null : category.id) },
                    },
                    t('tpl.delete'),
                  ),
                ),
                isRemoving
                  ? h(
                      'div',
                      { className: 'dpt-cat-remove' },
                      h('span', null, t('tpl.removeCategoryHint').replace('{n}', String(count))),
                      h(
                        'div',
                        { className: 'dpt-row' },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'btn template-btn fill',
                            onClick: function () {
                              props.onRemoveCategory(category.id, 'none')
                              setRemoving(null)
                            },
                          },
                          t('tpl.moveToUncategorized'),
                        ),
                        h(
                          'select',
                          {
                            className: 'template-field-input dpt-select',
                            defaultValue: '',
                            onChange: function (event) {
                              if (!event.target.value) return
                              props.onRemoveCategory(category.id, event.target.value)
                              setRemoving(null)
                            },
                          },
                          h('option', { value: '' }, t('tpl.moveTo')),
                          categories.map(function (other) {
                            if (other.id === category.id) return null
                            return h('option', { value: other.id, key: other.id }, other.name)
                          }),
                        ),
                        h(
                          'button',
                          { type: 'button', className: 'btn template-btn', onClick: function () { setRemoving(null) } },
                          t('tpl.cancel'),
                        ),
                      ),
                    )
                  : null,
              )
            }),
          ),
          h(
            'div',
            { className: 'template-modal-actions' },
            h(
              'div',
              { className: 'template-modal-actions-left' },
              h('button', { type: 'button', className: 'btn template-btn fill', onClick: startAdd }, t('tpl.addCategory')),
            ),
            h(
              'div',
              { className: 'template-modal-actions-right' },
              h('button', { type: 'button', className: 'btn template-btn', onClick: props.onBack }, t('tpl.back')),
            ),
          ),
        ),
      )
    }

    // ---------------------------------------------------------------- AI 建议确认
    function SuggestionModal(props) {
      var acceptedState = React.useState({})
      var accepted = acceptedState[0], setAccepted = acceptedState[1]
      var suggestions = props.suggestions

      React.useEffect(function () {
        var next = {}
        suggestions.forEach(function (item) {
          if (!item.error) next[item.id] = true
        })
        setAccepted(next)
      }, [suggestions.length])

      function apply() {
        var picked = suggestions.filter(function (item) {
          return accepted[item.id] && !item.error
        })
        props.onApply(picked)
      }

      return h(
        Overlay,
        null,
        h(
          'div',
          { className: 'modal template-modal' },
          h(
            'div',
            { className: 'template-modal-head' },
            h('span', { className: 'template-modal-icon' }, '✨'),
            h('span', { className: 'template-modal-title' }, t('tpl.suggestTitle')),
            h(
              'button',
              { type: 'button', className: 'btn template-modal-close', title: t('close'), onClick: props.onClose },
              h(FiX, null),
            ),
          ),
          h(
            'div',
            { className: 'template-modal-body' },
            h('div', { className: 'template-picker-hint' }, t('tpl.suggestHint')),
            suggestions.length === 0
              ? h('div', { className: 'dpt-empty-hint' }, t('tpl.suggestRunning'))
              : h(
                  'div',
                  { className: 'dpt-suggest' },
                  suggestions.map(function (item) {
                    var label = props.titleOf(item.id)
                    return h(
                      'label',
                      { className: 'dpt-suggest-row', key: item.id },
                      h('input', {
                        type: 'checkbox',
                        checked: !!accepted[item.id],
                        disabled: !!item.error,
                        onChange: function (event) {
                          setAccepted(Object.assign({}, accepted, { [item.id]: event.target.checked }))
                        },
                      }),
                      h('span', { className: 'empty-template-title', style: { flex: '0 1 auto' } }, label),
                      h(
                        'span',
                        { className: 'dpt-chip dpt-chip-cat' },
                        item.error ? t('tpl.suggestFailed') : props.categoryNameOf(item.category),
                      ),
                      (item.tags || []).slice(0, 4).map(function (tag) {
                        return h('span', { className: 'dpt-chip', key: tag }, tag)
                      }),
                    )
                  }),
                ),
          ),
          h(
            'div',
            { className: 'template-modal-actions' },
            h(
              'div',
              { className: 'template-modal-actions-left' },
              h('span', { className: 'template-picker-hint' }, t('tpl.manualFirst')),
            ),
            h(
              'div',
              { className: 'template-modal-actions-right' },
              h('button', { type: 'button', className: 'btn template-btn', onClick: props.onClose }, t('tpl.cancel')),
              h('button', { type: 'button', className: 'btn template-btn fill', onClick: apply }, t('tpl.applySuggest')),
            ),
          ),
        ),
      )
    }

    function createPanel() {
      var openState = false
      var modeState = 'picker' // 'picker' | 'categories' | 'suggest'
      var subs = new Set()
      function emit() {
        subs.forEach(function (fn) { fn() })
      }
      return {
        isOpen: function () { return openState },
        mode: function () { return modeState },
        open: function (mode) {
          modeState = mode || 'picker'
          openState = true
          emit()
        },
        setMode: function (next) {
          modeState = next
          openState = true
          emit()
        },
        close: function () {
          if (!openState) return
          openState = false
          modeState = 'picker'
          emit()
        },
        subscribe: function (fn) {
          subs.add(fn)
          return function () { subs.delete(fn) }
        },
      }
    }

    function Panel(props) {
      useStore()
      var panel = props.__panel
      var actions = props.inputActions
      var tick = React.useState(0)
      var setTick = tick[1]
      // 当前草稿：useInput 是标准 hook，返回 InputState 快照。
      var draftRef = React.useRef('')
      try {
        var inputState = props.useInput ? props.useInput(function (state) { return state }) : null
        if (inputState && typeof inputState.draft === 'string') draftRef.current = inputState.draft
      } catch (error) {
        /* 没有 input hook 时退回空草稿 */
      }

      React.useEffect(function () {
        return panel.subscribe(function () { setTick(function (n) { return n + 1 }) })
      }, [panel])

      var editingState = React.useState(null)
      var isNewState = React.useState(false)
      var fromPickerState = React.useState(false)
      var resetState = React.useState(false)
      var suggestState = React.useState(null)
      var suggestingState = React.useState(false)
      var editing = editingState[0], setEditing = editingState[1]
      var isNew = isNewState[0], setIsNew = isNewState[1]
      var fromPicker = fromPickerState[0], setFromPicker = fromPickerState[1]
      var resetConfirm = resetState[0], setResetConfirm = resetState[1]
      var suggestions = suggestState[0], setSuggestions = suggestState[1]
      var suggesting = suggestingState[0], setSuggesting = suggestingState[1]

      React.useEffect(
        function () {
          if (!resetConfirm) return
          var timer = setTimeout(function () { setResetConfirm(false) }, 5000)
          return function () { clearTimeout(timer) }
        },
        [resetConfirm],
      )

      React.useEffect(function () {
        var onFocus = function () { refresh() }
        window.addEventListener('focus', onFocus)
        return function () { window.removeEventListener('focus', onFocus) }
      }, [])

      var templates = React.useMemo(
        function () { return computeTemplates(store.items, store.builtin) },
        [store.items, store.builtin, store.revision],
      )

      function insert(text, submit) {
        var clean = String(text || '')
        if (!clean) return
        if (!actions || typeof actions.setDraft !== 'function') {
          console.warn('[dsh-prompt-templates] no inputActions.setDraft available')
          return
        }
        // 输入框可能已有草稿：默认追加到尾部，绝不覆盖用户正在写的内容。
        var existing = draftRef.current || ''
        var next = existing.trim()
          ? existing.replace(/\s+$/, '') + '\n\n' + clean
          : clean
        actions.setDraft(next)
        if (submit && typeof actions.submit === 'function') {
          setTimeout(function () { actions.submit() }, 30)
        }
        closeAll()
      }

      function openEdit(tpl, from) {
        setFromPicker(!!from)
        if (tpl) {
          setIsNew(false)
          setEditing(Object.assign({}, tpl))
        } else {
          setIsNew(true)
          setEditing({ id: randomId(), icon: '📌', title: '', desc: '', prompt: '' })
        }
      }

      function closeAll() {
        panel.close()
        setEditing(null)
        setFromPicker(false)
      }

      function backToPicker() {
        if (!fromPicker) return
        setFromPicker(false)
        panel.open()
      }

      function saveEdit(cleaned) {
        mutate({ action: 'upsert', template: cleaned }).then(function (ok) {
          if (!ok) return
          setEditing(null)
          backToPicker()
        })
      }

      function removeTemplate(tpl) {
        var body = tpl.builtin
          ? { action: 'upsert', template: { id: tpl.id, hidden: true } }
          : { action: 'remove', id: tpl.id }
        mutate(body).then(function (ok) {
          if (!ok) return
          setEditing(null)
          backToPicker()
        })
      }

      function restoreOverride(tpl) {
        mutate({ action: 'remove', id: tpl.id }).then(function (ok) {
          if (!ok) return
          setEditing(null)
          backToPicker()
        })
      }

      function toggleReset() {
        if (resetConfirm) {
          mutate({ action: 'reset' })
          setResetConfirm(false)
        } else {
          setResetConfirm(true)
        }
      }

      // ---- 分类 / 收藏 / 折叠 / AI ----
      function toggleFavorite(tpl) {
        var next = {
          id: tpl.id,
          icon: tpl.icon,
          title: tpl.title,
          desc: tpl.desc,
          prompt: tpl.prompt,
          command: tpl.command || '',
          category: tpl.category || '',
          tags: tpl.tags || [],
          favorite: !tpl.favorite,
        }
        mutate({ action: 'upsert', template: next })
      }

      function toggleCollapse(categoryId, collapsed) {
        var key = categoryId || '__none__'
        mutate({ action: 'ui/collapse', categoryId: key, collapsed: collapsed })
      }

      function addCategory(category) {
        mutate({
          action: 'category/add',
          category: { id: 'cat-' + randomId(), name: category.name, icon: category.icon, nameEn: category.nameEn },
        })
      }

      function updateCategory(id, patch) {
        mutate({ action: 'category/update', id: id, patch: patch })
      }

      function removeCategory(id, reassignTo) {
        mutate({ action: 'category/remove', id: id, reassignTo: reassignTo })
      }

      function reorderCategories(order) {
        mutate({ action: 'category/reorder', order: order })
      }

      function countOf(categoryId) {
        return templates.filter(function (tpl) { return tpl.category === categoryId }).length
      }

      function runClassify(ids) {
        setSuggesting(true)
        setSuggestions(null)
        setEditing(null)
        panel.setMode('suggest')
        fetch('/__prompt-templates/classify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ids: ids || null }),
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) throw new Error((data && data.error) || response.statusText)
              setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
            })
          })
          .catch(function (error) {
            store.setError(String((error && error.message) || error))
            setSuggestions([])
          })
          .then(function () { setSuggesting(false) })
      }

      function applySuggestions(picked) {
        // 只在用户确认后写入；已有手动分类的模板在 UI 上默认不勾选。
        var chain = Promise.resolve()
        picked.forEach(function (item) {
          chain = chain.then(function () {
            var tpl = templates.find(function (entry) { return entry.id === item.id })
            if (!tpl) return
            return mutate({
              action: 'upsert',
              template: {
                id: tpl.id,
                icon: tpl.icon,
                title: tpl.title,
                desc: tpl.desc,
                prompt: tpl.prompt,
                command: tpl.command || '',
                tags: item.tags && item.tags.length ? item.tags : tpl.tags || [],
                category: item.category === '未分类' ? '' : item.category,
                favorite: !!tpl.favorite,
              },
            })
          })
        })
        chain.then(function () {
          setSuggestions(null)
          panel.setMode('picker')
        })
      }

      function categoryNameOf(name) {
        return name || t('tpl.uncategorized')
      }

      function titleOf(id) {
        var tpl = templates.find(function (entry) { return entry.id === id })
        return tpl ? tpl.title : id
      }

      var pickerOpen = panel.isOpen()
      var mode = panel.mode()

      // 面板打开期间限制 composer 输入区高度，避免长草稿把锚点顶到视口外。
      // 用 dsh 暴露的稳定属性 [data-composer-seat] 与官方变量，不依赖哈希类名。
      React.useEffect(
        function () {
          var open = pickerOpen || !!editing
          if (!open) return
          var seat = document.querySelector('[data-composer-seat]')
          if (!seat) return
          var prev = seat.style.getPropertyValue('--dsh-composer-text-max-height')
          seat.style.setProperty('--dsh-composer-text-max-height', '168px')
          return function () {
            if (prev) seat.style.setProperty('--dsh-composer-text-max-height', prev)
            else seat.style.removeProperty('--dsh-composer-text-max-height')
          }
        },
        [pickerOpen, editing],
      )
      var hasOverride = editing
        ? (store.items || []).some(function (entry) {
            return entry && entry.id === editing.id && !entry.hidden && typeof entry.title === 'string'
          })
        : false

      var children = []
      if (store.error) {
        children.push(
          h('div', { className: 'template-error', role: 'alert', key: 'err' }, t('tpl.storageError') + ': ' + store.error),
        )
      }
      if (pickerOpen && !editing && mode === 'picker') {
        children.push(
          h(PickerModal, {
            key: 'picker',
            templates: templates,
            categories: sortedCategories(store.categories),
            collapsed: (store.ui && store.ui.collapsed) || {},
            resetConfirm: resetConfirm,
            onFill: function (tpl) { insert(tpl.prompt, false) },
            onEditTpl: function (tpl) { openEdit(tpl, true) },
            onNew: function () { openEdit(undefined, true) },
            onToggleFavorite: toggleFavorite,
            onToggleCollapse: toggleCollapse,
            onManageCategories: function () { setEditing(null); panel.setMode('categories') },
            onBatchClassify: function () { runClassify(null) },
            onResetToggle: toggleReset,
            onClose: closeAll,
          }),
        )
      }
      if (pickerOpen && !editing && mode === 'categories') {
        children.push(
          h(CategoryManager, {
            key: 'categories',
            categories: sortedCategories(store.categories),
            countOf: countOf,
            onAddCategory: addCategory,
            onUpdateCategory: updateCategory,
            onRemoveCategory: removeCategory,
            onReorder: reorderCategories,
            onBack: function () { panel.setMode('picker') },
            onClose: closeAll,
          }),
        )
      }
      if (pickerOpen && !editing && mode === 'suggest') {
        children.push(
          h(SuggestionModal, {
            key: 'suggest',
            suggestions: suggestions || [],
            categoryNameOf: categoryNameOf,
            titleOf: titleOf,
            onApply: applySuggestions,
            onClose: function () { setSuggestions(null); panel.setMode('picker') },
          }),
        )
      }
      if (editing) {
        children.push(
          h(EditModal, {
            key: 'edit',
            editing: editing,
            isNew: isNew,
            hasOverride: hasOverride,
            storageError: store.error,
            templates: templates,
            categories: sortedCategories(store.categories),
            suggesting: suggesting,
            onSuggest: function () {
              if (!editing || !String(editing.title || '').trim()) {
                setEditing(Object.assign({}, editing, { error: t('tpl.required') }))
                return
              }
              runClassify([editing.id])
            },
            onDraft: setEditing,
            onSave: saveEdit,
            onRestore: function () { restoreOverride(editing) },
            onRemove: function () { removeTemplate(editing) },
            onFill: function () { insert(editing.prompt, false) },
            onSend: function () { insert(editing.prompt, true) },
            onClose: closeAll,
          }),
        )
      }
      return h(React.Fragment, null, children)
    }

    // ---------------------------------------------------------------- apply
    function apply(ctx) {
      var slots = ctx.get('slots')
      if (!slots) {
        console.warn('[dsh-prompt-templates] slots service unavailable')
        return
      }

      // 样式：所有面板实例与按钮共用一份，随插件卸载移除。
      var styleEl = document.createElement('style')
      styleEl.setAttribute('data-dsh-plugin', 'dsh-prompt-templates')
      styleEl.textContent = PI_CSS
      document.head.appendChild(styleEl)
      ctx.effect(function () {
        return function () {
          if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl)
        }
      })

      // 每个会话一个面板实例；触发按钮与浮层用同一个 sessionId 取到同一个面板。
      var byKey = new Map()
      function panelForSession(props) {
        var key = props && props.sessionId ? String(props.sessionId) : '(none)'
        var existing = byKey.get(key)
        if (existing) return existing
        var created = createPanel()
        byKey.set(key, created)
        return created
      }

      ctx.effect(function () {
        return slots.inject('conversation.input.left', function () {
          return slots.register(
            { name: 'conversation.input.left', id: 'prompt-templates-trigger', order: 20, label: t('tpl.openPicker') },
            function TriggerEntry(props) {
              React.useEffect(function () { refresh() }, [])
              return h(Trigger, Object.assign({}, props, { __panel: panelForSession(props) }))
            },
          )
        })
      })

      ctx.effect(function () {
        return slots.inject('conversation.input.overlay', function () {
          return slots.register(
            { name: 'conversation.input.overlay', id: 'prompt-templates-panel', order: 50, label: t('tpl.title') },
            function PanelEntry(props) {
              return h(Panel, Object.assign({}, props, { __panel: panelForSession(props) }))
            },
          )
        })
      })

      console.log('[dsh-prompt-templates] client ready')
    }

    exports.apply = apply
    exports.inject = ['slots']
    // ModuleLoader 读取的是 factory 的返回值。
    return module.exports
  },
})
