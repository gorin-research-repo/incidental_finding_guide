(() => {
  "use strict";

  const findings = window.INCIDENTAL_FINDINGS || [];
  const references = window.INCIDENTAL_REFERENCES || {};

  const organSelect = document.querySelector("#organ-select");
  const findingSelect = document.querySelector("#finding-select");
  const clearButton = document.querySelector("#clear-button");
  const shareButton = document.querySelector("#share-button");
  const emptyState = document.querySelector("#empty-state");
  const result = document.querySelector("#result");
  const actionCard = document.querySelector("#action-card");
  const referencesCard = document.querySelector("#references-card");
  const referenceList = document.querySelector("#result-references");
  const referenceCount = document.querySelector("#reference-count");
  const toast = document.querySelector("#toast");

  const resultOrgan = document.querySelector("#result-organ");
  const resultFinding = document.querySelector("#result-finding");
  const resultAction = document.querySelector("#result-action");
  const resultContrast = document.querySelector("#result-contrast");
  const resultRationale = document.querySelector("#result-rationale");

  let toastTimer;

  const slugify = (value) =>
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-");

  const createOption = (label, value) => {
    const option = document.createElement("option");
    option.textContent = label;
    option.value = value;
    return option;
  };

  const findingsForOrgan = (organ) =>
    findings.filter((item) => item.organ === organ);

  function populateOrgans() {
    const organs = [...new Set(findings.map((item) => item.organ))];
    organs.forEach((organ) => organSelect.append(createOption(organ, organ)));
  }

  function populateFindings(organ, selectedSlug = "") {
    findingSelect.replaceChildren();

    if (!organ) {
      findingSelect.append(createOption("Select an organ system first", ""));
      findingSelect.disabled = true;
      return;
    }

    findingSelect.append(createOption("Select an incidental finding", ""));
    findingsForOrgan(organ).forEach((item) => {
      findingSelect.append(createOption(item.finding, slugify(item.finding)));
    });
    findingSelect.disabled = false;
    findingSelect.value = selectedSlug;
  }

  function actionTone(nextStep) {
    const normalized = nextStep.toLowerCase();
    if (normalized.includes("urgent")) return "urgent";
    if (
      normalized.startsWith("no action") ||
      normalized.startsWith("no routine") ||
      normalized.startsWith("primary care")
    ) {
      return "";
    }
    return "follow-up";
  }

  function renderReferences(referenceNumbers) {
    referenceList.replaceChildren();

    if (!referenceNumbers.length) {
      referencesCard.hidden = true;
      return;
    }

    referencesCard.hidden = false;
    referenceCount.textContent = `${referenceNumbers.length} ${
      referenceNumbers.length === 1 ? "source" : "sources"
    }`;

    referenceNumbers.forEach((number) => {
      const reference = references[number];
      if (!reference) return;

      const item = document.createElement("li");
      if (reference.url) {
        const link = document.createElement("a");
        link.href = reference.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = reference.citation;
        link.setAttribute("aria-label", `${reference.citation} (opens in a new tab)`);

        const externalIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        externalIcon.setAttribute("class", "external-icon");
        externalIcon.setAttribute("viewBox", "0 0 16 16");
        externalIcon.setAttribute("aria-hidden", "true");
        externalIcon.innerHTML =
          '<path d="M9 3h4v4M7 9l6-6M13 9v4H3V3h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4"/>';
        link.append(externalIcon);
        item.append(link);
      } else {
        item.textContent = reference.citation;
      }
      referenceList.append(item);
    });
  }

  function findSelectedItem() {
    const organ = organSelect.value;
    const findingSlug = findingSelect.value;
    return findingsForOrgan(organ).find(
      (item) => slugify(item.finding) === findingSlug,
    );
  }

  function renderResult(item, updateUrl = true) {
    if (!item) {
      emptyState.hidden = false;
      result.hidden = true;
      clearButton.hidden = !organSelect.value;
      if (updateUrl) window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    resultOrgan.textContent = item.organ;
    resultFinding.textContent = item.finding;
    resultAction.textContent = item.nextStep;
    resultContrast.textContent = item.contrast;
    resultRationale.textContent = item.rationale;

    actionCard.classList.remove("urgent", "follow-up");
    const tone = actionTone(item.nextStep);
    if (tone) actionCard.classList.add(tone);

    renderReferences(item.references);
    emptyState.hidden = true;
    result.hidden = false;
    clearButton.hidden = false;

    if (updateUrl) {
      const params = new URLSearchParams({
        organ: slugify(item.organ),
        finding: slugify(item.finding),
      });
      window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
    }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  organSelect.addEventListener("change", () => {
    populateFindings(organSelect.value);
    renderResult(null);
    if (organSelect.value) findingSelect.focus();
  });

  findingSelect.addEventListener("change", () => {
    renderResult(findSelectedItem());
  });

  clearButton.addEventListener("click", () => {
    organSelect.value = "";
    populateFindings("");
    renderResult(null);
    organSelect.focus();
  });

  shareButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Copy the link from your address bar");
    }
  });

  function restoreFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const organSlug = params.get("organ");
    const findingSlug = params.get("finding");
    if (!organSlug || !findingSlug) return;

    const organ = [...new Set(findings.map((item) => item.organ))].find(
      (item) => slugify(item) === organSlug,
    );
    if (!organ) return;

    const item = findingsForOrgan(organ).find(
      (candidate) => slugify(candidate.finding) === findingSlug,
    );
    if (!item) return;

    organSelect.value = organ;
    populateFindings(organ, findingSlug);
    renderResult(item, false);
  }

  populateOrgans();
  restoreFromUrl();
  document.querySelector("#year").textContent = new Date().getFullYear();
})();
