import { journeyStore } from './store.js';
import { calculateAgeFromDateOfBirth, dateValueFromParts, initChapterOne } from './chapter-one.js';

let firstName = '';

const CHAPTERS = Object.freeze(['I', 'II', 'III', 'IV', 'V', 'VI']);

function chapterForScreen(screen){
  const chapterMatch = screen.id.match(/^ch([1-7])(?:-|$)/);
  if (chapterMatch) return Math.min(Number(chapterMatch[1]), CHAPTERS.length);
  return null;
}

function renderChapterProgress(wrap, currentChapter){
  if (!currentChapter) {
    wrap.replaceChildren();
    return;
  }

  const numeral = document.createElement('span');
  numeral.className = 'chapter-numeral';
  numeral.textContent = CHAPTERS[currentChapter - 1];
  numeral.setAttribute('aria-label', `Chapter ${currentChapter} of ${CHAPTERS.length}`);
  numeral.setAttribute('aria-current', 'step');
  wrap.replaceChildren(numeral);
}

function upgradeClickableControls(screen){
  const selector = '.pill, .unit-pill, .chip, .choice-card';
  screen.querySelectorAll(selector).forEach((control) => {
    if (control.tagName === 'BUTTON') return;
    const button = document.createElement('button');
    [...control.attributes].forEach(({ name, value }) => button.setAttribute(name, value));
    button.type = 'button';
    button.setAttribute('aria-pressed', String(control.classList.contains('selected')));
    button.innerHTML = control.innerHTML;
    control.replaceWith(button);
  });
}

function associateFieldLabels(screen){
  screen.querySelectorAll('.field').forEach((field, index) => {
    const label = field.querySelector(':scope > label');
    if (!label) return;
    if (!label.id) label.id = `${screen.id}-field-label-${index + 1}`;

    const control = field.querySelector(':scope > input, :scope > select, :scope > textarea');
    if (control) {
      if (!control.id) control.id = `${screen.id}-field-${index + 1}`;
      label.htmlFor = control.id;
      return;
    }

    const group = field.querySelector('.pill-group, .unit-toggle, .tag-input-wrap, .age-preference, .slider-track');
    if (group) {
      if (!group.hasAttribute('role')) group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', label.id);
    }
  });
}

function prepareJourneyLayout(screen){
  const stage = screen.querySelector('.donna-stage');
  const question = stage?.querySelector(':scope > .donna-row');
  const answer = stage?.querySelector(':scope > .answer-zone, :scope > .answer-card');
  const actions = stage?.querySelector(':scope > .actions') || answer?.querySelector(':scope > .actions');

  if (!stage || !question || !answer || !actions) return;

  question.classList.add('question-block');
  answer.classList.add('answer-region');
  answer.tabIndex = 0;
  answer.setAttribute('aria-label', 'Answer area');
  answer.addEventListener('focusin', ({ target }) => {
    target.scrollIntoView({ block: 'nearest' });
  });
  actions.classList.add('journey-actions');
  stage.append(actions);
  upgradeClickableControls(screen);
  associateFieldLabels(screen);
}

function initJourneyHeaders(){
  document.querySelectorAll('.progress-wrap').forEach((wrap) => {
    const screen = wrap.closest('.screen');
    if (!screen) return;
    screen.classList.add('journey-screen');
    screen.querySelectorAll('.exit').forEach((exit) => exit.remove());
    prepareJourneyLayout(screen);
    renderChapterProgress(wrap, chapterForScreen(screen));
  });
}

function initAgePreference(){
  const root = document.querySelector('[data-age-preference]');
  const dateInput = document.getElementById('chapterOneDateOfBirth');
  const anchor = document.getElementById('agePreferenceAnchor');
  const applicantAge = document.getElementById('applicantAge');
  const youngerLabel = document.getElementById('youngerLabel');
  const olderLabel = document.getElementById('olderLabel');
  const youngerOutput = document.getElementById('youngerOffset');
  const olderOutput = document.getElementById('olderOffset');
  const minimumOutput = document.getElementById('ageRangeMinimum');
  const maximumOutput = document.getElementById('ageRangeMaximum');
  if (!root || !dateInput || !anchor || !applicantAge || !youngerLabel || !olderLabel || !youngerOutput || !olderOutput || !minimumOutput || !maximumOutput) return;

  const buttons = [...root.querySelectorAll('[data-age-step]')];
  let younger = 3;
  let older = 7;
  let fallbackMinimum = Math.max(22,Math.min(55,journeyStore.getState().applicant.preferredAge.minimum));
  let fallbackMaximum = Math.max(fallbackMinimum,Math.min(55,journeyStore.getState().applicant.preferredAge.maximum));

  function setButton(button, label, disabled){
    button.setAttribute('aria-label', label);
    button.disabled = disabled;
  }

  function sync(){
    const age = calculateAgeFromDateOfBirth(dateInput.value || dateValueFromParts(journeyStore.getState().applicant.dateOfBirth));
    const anchored = age !== null;
    anchor.hidden = !anchored;
    if (anchored) {
      root.setAttribute('aria-labelledby','agePreferenceAnchor');
      root.removeAttribute('aria-label');
    } else {
      root.removeAttribute('aria-labelledby');
      root.setAttribute('aria-label','Age range');
    }
    youngerLabel.textContent = anchored ? 'Younger by' : 'Minimum age';
    olderLabel.textContent = anchored ? 'Older by' : 'Maximum age';

    let minimum;
    let maximum;
    if (anchored) {
      const maximumYounger = Math.max(0,Math.min(20,age - 22));
      younger = Math.min(younger,maximumYounger);
      older = Math.max(0,Math.min(20,older));
      minimum = Math.max(22,age - younger);
      maximum = age + older;
      applicantAge.textContent = String(age);
      youngerOutput.value = String(younger);
      olderOutput.value = String(older);
      setButton(buttons.find((button) => button.dataset.ageStep === 'younger' && button.dataset.direction === 'decrement'),'Fewer years younger',younger === 0);
      setButton(buttons.find((button) => button.dataset.ageStep === 'younger' && button.dataset.direction === 'increment'),'More years younger',younger === maximumYounger);
      setButton(buttons.find((button) => button.dataset.ageStep === 'older' && button.dataset.direction === 'decrement'),'Fewer years older',older === 0);
      setButton(buttons.find((button) => button.dataset.ageStep === 'older' && button.dataset.direction === 'increment'),'More years older',older === 20);
    } else {
      minimum = fallbackMinimum;
      maximum = fallbackMaximum;
      youngerOutput.value = String(minimum);
      olderOutput.value = String(maximum);
      setButton(buttons.find((button) => button.dataset.ageStep === 'younger' && button.dataset.direction === 'decrement'),'Lower minimum age',minimum === 22);
      setButton(buttons.find((button) => button.dataset.ageStep === 'younger' && button.dataset.direction === 'increment'),'Raise minimum age',minimum === maximum);
      setButton(buttons.find((button) => button.dataset.ageStep === 'older' && button.dataset.direction === 'decrement'),'Lower maximum age',maximum === minimum);
      setButton(buttons.find((button) => button.dataset.ageStep === 'older' && button.dataset.direction === 'increment'),'Raise maximum age',maximum === 55);
    }

    minimumOutput.value = String(minimum);
    maximumOutput.value = String(maximum);
    journeyStore.setField('applicant.preferredAge.minimum',minimum);
    journeyStore.setField('applicant.preferredAge.maximum',maximum);
  }

  buttons.forEach((button) => button.addEventListener('click', () => {
    const direction = button.dataset.direction === 'increment' ? 1 : -1;
    const age = calculateAgeFromDateOfBirth(dateInput.value || dateValueFromParts(journeyStore.getState().applicant.dateOfBirth));
    if (age !== null) {
      if (button.dataset.ageStep === 'younger') younger += direction;
      else older += direction;
    } else if (button.dataset.ageStep === 'younger') {
      fallbackMinimum += direction;
    } else {
      fallbackMaximum += direction;
    }
    sync();
  }));

  dateInput.addEventListener('input', sync);
  sync();
}

initJourneyHeaders();
initAgePreference();

function showScreen(id){
  if (id === 'signup-choice') id = 'landing';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  target.classList.add('active');
  document.getElementById('journey-root').dispatchEvent(new CustomEvent('journey:navigate', {
    bubbles: true,
    detail: { screenId: id },
  }));
  window.scrollTo(0,0);
  return target;
}

let chapterTransitionTimer = null;

function goTo(id){
  if (id === 'signup-choice') id = 'landing';
  const current = document.querySelector('.screen.active');
  const target = document.getElementById(id);
  const currentChapter = current ? chapterForScreen(current) : null;
  const targetChapter = target ? chapterForScreen(target) : null;
  const chapterChanged = currentChapter !== null && targetChapter !== null && currentChapter !== targetChapter;

  window.clearTimeout(chapterTransitionTimer);

  if (!chapterChanged) {
    const shown = showScreen(id);
    if (currentChapter === null && targetChapter !== null) {
      const incoming = shown.querySelector('.chapter-numeral');
      if (incoming) {
        incoming.classList.add('is-entering');
        requestAnimationFrame(() => incoming.classList.remove('is-entering'));
      }
    }
    return;
  }

  current.querySelector('.chapter-numeral')?.classList.add('is-leaving');
  chapterTransitionTimer = window.setTimeout(() => {
    const shown = showScreen(id);
    const incoming = shown.querySelector('.chapter-numeral');
    if (!incoming) return;
    incoming.classList.add('is-entering');
    requestAnimationFrame(() => incoming.classList.remove('is-entering'));
  }, 180);
}

initChapterOne(goTo);

function updateName(val){
  firstName = val.trim().split(' ')[0];
  const h = document.getElementById('ch1Headline');
  if (h) h.textContent = firstName ? `Nice to meet you, ${firstName}` : "Who are we talking to?";
  const ch1c = document.getElementById('ch1CompleteHeadline');
  if (ch1c) ch1c.textContent = firstName ? `Nicely done, ${firstName}.` : "That section is done.";
  const finalH = document.getElementById('finalHeadline');
  if (finalH) finalH.textContent = firstName ? `That's everything, ${firstName}.` : "That's everything, for now.";
}

function selectChoice(el){
  const parent = el.parentElement;
  [...parent.children].forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  el.classList.add('selected');
  el.setAttribute('aria-pressed', 'true');
  if (parent.closest('#signup-choice')) {
    journeyStore.setField('route', [...parent.children].indexOf(el) === 1 ? 'referrer' : 'applicant');
  }
}

function selectPill(el){
  const parent = el.parentElement;
  [...parent.children].forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  el.classList.add('selected');
  el.setAttribute('aria-pressed', 'true');}

const selectedChips = new Set();
function toggleChip(el, label){
  const textarea = document.getElementById('boundariesText');
  if (selectedChips.has(label)) {
    selectedChips.delete(label);
    el.classList.remove('selected');
    el.setAttribute('aria-pressed', 'false');
  } else {
    selectedChips.add(label);
    el.classList.add('selected');
    el.setAttribute('aria-pressed', 'true');
  }
  textarea.value = Array.from(selectedChips).join(', ');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function clearLinkedInError(){
  document.getElementById('linkedinInput').classList.remove('error');
  document.getElementById('linkedinError').style.display = 'none';
}

// ---- Generic tag input factory ----
function makeTagInput({ boxId, inputId, dropdownId, list, statePath }){
  const selected = [];
  let highlightIdx = -1;

  function render(){
    const box = document.getElementById(boxId);
    const input = document.getElementById(inputId);
    box.querySelectorAll('.tag-bubble').forEach(b => b.remove());
    selected.forEach((item, i) => {
      const bubble = document.createElement('div');
      bubble.className = 'tag-bubble';
      bubble.innerHTML = `<span>${item}</span><span class="tag-x">&times;</span>`;
      bubble.querySelector('.tag-x').onclick = (e) => { e.stopPropagation(); selected.splice(i,1); render(); syncState(); };
      box.insertBefore(bubble, input);
    });
  }

  function syncState(){
    if (statePath) journeyStore.setField(statePath, [...selected]);
  }

  function add(item){
    item = item.trim();
    if (!item) return;
    if (!selected.some(s => s.toLowerCase() === item.toLowerCase())) selected.push(item);
    document.getElementById(inputId).value = '';
    render();
    syncState();
    close();
  }

  function renderOptions(items){
    const dropdown = document.getElementById(dropdownId);
    if (items.length === 0){ close(); return; }
    dropdown.innerHTML = items.map(i => `<div class="tag-option">${i}</div>`).join('');
    [...dropdown.children].forEach((el, i) => el.onclick = () => add(items[i]));
    dropdown.classList.add('show');
  }

  function filter(val){
    highlightIdx = -1;
    const remaining = list.filter(l => !selected.includes(l));
    if (!val.trim()){ renderOptions(remaining.slice(0, 8)); return; }
    const matches = remaining.filter(l => l.toLowerCase().includes(val.toLowerCase()));
    renderOptions(matches.slice(0, 8));
  }

  function close(){ document.getElementById(dropdownId).classList.remove('show'); }

  function keydown(evt){
    const dropdown = document.getElementById(dropdownId);
    const options = dropdown.querySelectorAll('.tag-option');
    if (evt.key === 'Enter'){
      evt.preventDefault();
      if (highlightIdx >= 0 && options[highlightIdx]) add(options[highlightIdx].textContent);
      else if (evt.target.value.trim()) add(evt.target.value);
    } else if (evt.key === 'Backspace' && !evt.target.value && selected.length){
      selected.pop(); render(); syncState();
    } else if (evt.key === 'ArrowDown'){
      evt.preventDefault();
      highlightIdx = Math.min(highlightIdx + 1, options.length - 1);
      options.forEach((o,i) => o.classList.toggle('highlighted', i === highlightIdx));
    } else if (evt.key === 'ArrowUp'){
      evt.preventDefault();
      highlightIdx = Math.max(highlightIdx - 1, 0);
      options.forEach((o,i) => o.classList.toggle('highlighted', i === highlightIdx));
    } else if (evt.key === 'Escape'){ close(); }
  }

  return { filter, keydown, close };
}

const CITIES = [
  "Bengaluru","Mumbai","Delhi","Chennai","Hyderabad","Pune","Kolkata","Ahmedabad",
  "Kochi","Coimbatore","Jaipur","Chandigarh","Gurugram","Noida",
  "Dubai","Singapore","London","New York","San Francisco","Toronto","Sydney","Melbourne","Berlin","Amsterdam"
];
const cityTagInput = makeTagInput({ boxId:'cityTagBox', inputId:'cityInput', dropdownId:'cityDropdown', list: CITIES, statePath:'applicant.relocationCities' });
function filterCities(val){ cityTagInput.filter(val); }
function cityKeydown(evt){ cityTagInput.keydown(evt); }

function selectLivingSituation(el){
  selectPill(el);
  const otherInput = document.getElementById('livingOtherInput');
  otherInput.style.display = el.textContent.trim() === 'Other' ? 'block' : 'none';
}

function setHeightUnit(unit, el){
  const parent = el.parentElement;
  [...parent.children].forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-pressed', 'false');
  });
  el.classList.add('selected');
  el.setAttribute('aria-pressed', 'true');
  document.getElementById('heightFtRow').style.display = unit === 'ft' ? 'grid' : 'none';
  document.getElementById('heightCmInput').style.display = unit === 'cm' ? 'block' : 'none';
  journeyStore.setField('applicant.height.unit', unit);
}

function validateLinkedIn(){
  const input = document.getElementById('linkedinInput');
  const error = document.getElementById('linkedinError');
  if (!input.value.trim()){
    input.classList.add('error');
    error.style.display = 'block';
    input.focus();
    return;
  }
  input.classList.remove('error');
  error.style.display = 'none';
  goTo('ch4-1');
}

function setSlider(evt, track){
  const rect = track.getBoundingClientRect();
  let pct = ((evt.clientX - rect.left) / rect.width) * 100;
  pct = Math.max(0, Math.min(100, pct));
  document.getElementById('faithFill').style.width = pct + '%';
  document.getElementById('faithHandle').style.left = pct + '%';
  journeyStore.setField('applicant.sharedBackgroundImportance', Math.round(pct));
}

(function initFaithSlider(){
  const track = document.getElementById('faithSlider');
  const handle = document.getElementById('faithHandle');
  let dragging = false;

  function update(clientX){
    const rect = track.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    document.getElementById('faithFill').style.width = pct + '%';
    document.getElementById('faithHandle').style.left = pct + '%';
    journeyStore.setField('applicant.sharedBackgroundImportance', Math.round(pct));
  }

  track.addEventListener('click', (e) => { if (!dragging) update(e.clientX); });
  handle.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
  handle.addEventListener('touchstart', (e) => { dragging = true; }, {passive:true});

  document.addEventListener('mousemove', (e) => { if (dragging) update(e.clientX); });
  document.addEventListener('touchmove', (e) => { if (dragging) update(e.touches[0].clientX); }, {passive:true});
  document.addEventListener('mouseup', () => dragging = false);
  document.addEventListener('touchend', () => dragging = false);
})();

// ---- Language tag input ----
const LANGUAGES = [
  "English","Hindi","Tamil","Telugu","Kannada","Malayalam","Marathi","Gujarati","Punjabi",
  "Bengali","Urdu","Odia","Assamese","Konkani","Sanskrit","Sindhi","Kashmiri",
  "French","Spanish","German","Mandarin","Japanese","Korean","Arabic","Portuguese",
  "Italian","Russian","Dutch"
];
const selectedLangs = [];
let langHighlightIdx = -1;

function renderLangBubbles(){
  const box = document.getElementById('langTagBox');
  const input = document.getElementById('langInput');
  box.querySelectorAll('.tag-bubble').forEach(b => b.remove());
  selectedLangs.forEach((lang, i) => {
    const bubble = document.createElement('div');
    bubble.className = 'tag-bubble';
    bubble.innerHTML = `<span>${lang}</span><span class="tag-x" onclick="removeLang(event, ${i})">&times;</span>`;
    box.insertBefore(bubble, input);
  });
}

function removeLang(evt, i){
  evt.stopPropagation();
  selectedLangs.splice(i, 1);
  renderLangBubbles();
  journeyStore.setField('applicant.languages', [...selectedLangs]);
}

function addLang(lang){
  lang = lang.trim();
  if (!lang) return;
  const exists = selectedLangs.some(l => l.toLowerCase() === lang.toLowerCase());
  if (!exists) selectedLangs.push(lang);
  document.getElementById('langInput').value = '';
  renderLangBubbles();
  journeyStore.setField('applicant.languages', [...selectedLangs]);
  closeLangDropdown();
}

function filterLangs(val){
  const dropdown = document.getElementById('langDropdown');
  langHighlightIdx = -1;
  if (!val.trim()){
    const remaining = LANGUAGES.filter(l => !selectedLangs.includes(l));
    renderLangOptions(remaining.slice(0, 8));
    return;
  }
  const matches = LANGUAGES.filter(l =>
    l.toLowerCase().includes(val.toLowerCase()) && !selectedLangs.includes(l)
  );
  renderLangOptions(matches.slice(0, 8));
}

function renderLangOptions(list){
  const dropdown = document.getElementById('langDropdown');
  if (list.length === 0){ closeLangDropdown(); return; }
  dropdown.innerHTML = list.map((l, i) => `<div class="tag-option" data-idx="${i}" onclick="addLang('${l}')">${l}</div>`).join('');
  dropdown.classList.add('show');
}

function closeLangDropdown(){
  document.getElementById('langDropdown').classList.remove('show');
}

function langKeydown(evt){
  const dropdown = document.getElementById('langDropdown');
  const options = dropdown.querySelectorAll('.tag-option');
  if (evt.key === 'Enter'){
    evt.preventDefault();
    if (langHighlightIdx >= 0 && options[langHighlightIdx]){
      addLang(options[langHighlightIdx].textContent);
    } else if (evt.target.value.trim()){
      addLang(evt.target.value);
    }
  } else if (evt.key === 'Backspace' && !evt.target.value && selectedLangs.length){
    selectedLangs.pop();
    renderLangBubbles();
    journeyStore.setField('applicant.languages', [...selectedLangs]);
  } else if (evt.key === 'ArrowDown'){
    evt.preventDefault();
    langHighlightIdx = Math.min(langHighlightIdx + 1, options.length - 1);
    options.forEach((o,i) => o.classList.toggle('highlighted', i === langHighlightIdx));
  } else if (evt.key === 'ArrowUp'){
    evt.preventDefault();
    langHighlightIdx = Math.max(langHighlightIdx - 1, 0);
    options.forEach((o,i) => o.classList.toggle('highlighted', i === langHighlightIdx));
  } else if (evt.key === 'Escape'){
    closeLangDropdown();
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.tag-input-wrap')){
    closeLangDropdown();
    document.getElementById('cityDropdown').classList.remove('show');
  }
});

Object.assign(window, {
  initJourneyHeaders,
  initAgePreference,
  goTo,
  updateName,
  selectChoice,
  selectPill,
  toggleChip,
  clearLinkedInError,
  makeTagInput,
  filterCities,
  cityKeydown,
  selectLivingSituation,
  setHeightUnit,
  validateLinkedIn,
  setSlider,
  renderLangBubbles,
  removeLang,
  addLang,
  filterLangs,
  renderLangOptions,
  closeLangDropdown,
  langKeydown,
});
