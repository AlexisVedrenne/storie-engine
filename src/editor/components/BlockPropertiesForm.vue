<template>
  <div class="block-props">
    <template v-if="block.type === 'header'">
      <div class="prop-group-label">{{ t('blockProps.groupContent') }}</div>
      <q-input
        dense
        outlined
        ref="titleInputRef"
        :label="t('blockProps.titleLabel')"
        v-model="block.title"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.title = insertEmojiAtCaret(titleInputRef, block.title, v))"
          />
        </template>
      </q-input>

      <div class="prop-group-label">{{ t('blockProps.groupAppearance') }}</div>
      <q-input dense outlined :label="t('blockProps.iconLabel')" v-model="block.icon">
        <template #append>
          <IconPickerBtn @pick="(v) => (block.icon = v)" />
        </template>
      </q-input>
      <ColorField v-model="block.color" clearable />
      <q-toggle dense :label="t('blockProps.stickyHeaderLabel')" v-model="block.sticky" />
    </template>

    <template v-else-if="block.type === 'footer'">
      <p class="tab-help">{{ t('blockProps.footerHelp') }}</p>
      <q-toggle dense :label="t('blockProps.stickyFooterLabel')" v-model="block.sticky" />
      <q-btn-toggle
        dense
        no-caps
        v-model="block.direction"
        :options="[
          { label: t('blockProps.directionRow'), value: 'row' },
          { label: t('blockProps.directionColumn'), value: 'column' },
        ]"
      />
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.gapLabel')"
        suffix="px"
        :model-value="block.gap ?? 8"
        @update:model-value="(v) => (block.gap = v === null || v === '' ? 8 : Number(v))"
      />
      <ColorField v-model="block.bgColor" :label="t('blockProps.bgColorLabel')" clearable />
      <BlockBuilder
        :blocks="ensureChildren()"
        :screens="screens"
        :sheets="sheets"
        :item-scope="itemScope"
        :depth="depth + 1"
      />
    </template>

    <template v-else-if="block.type === 'text'">
      <div class="prop-group-label">{{ t('blockProps.groupContent') }}</div>
      <q-btn-toggle
        dense
        no-caps
        v-model="block.style"
        :options="[
          { label: t('blockProps.styleTitle'), value: 'title' },
          { label: t('blockProps.styleBody'), value: 'body' },
        ]"
      />
      <q-input
        dense
        outlined
        type="textarea"
        autogrow
        ref="contentInputRef"
        :label="t('blockProps.contentLabel')"
        v-model="block.content"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.content = insertEmojiAtCaret(contentInputRef, block.content, v))"
          />
        </template>
      </q-input>

      <div class="prop-group-label">{{ t('blockProps.groupAppearance') }}</div>
      <div class="row">
        <ColorField
          v-model="block.color"
          :label="t('blockProps.textColorLabel')"
          default-value="#ffffff"
          class="grow"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.textSizeLabel')"
          :hint="t('blockProps.textSizeHelp')"
          suffix="px"
          :model-value="block.size ?? null"
          @update:model-value="(v) => (block.size = v === null || v === '' ? null : Number(v))"
          class="grow"
        />
      </div>
      <q-btn-toggle
        dense
        no-caps
        :model-value="block.align || 'left'"
        @update:model-value="(v) => (block.align = v === 'left' ? '' : v)"
        :options="[
          { label: t('blockProps.alignLeft'), value: 'left', icon: 'format_align_left' },
          { label: t('blockProps.alignCenter'), value: 'center', icon: 'format_align_center' },
          { label: t('blockProps.alignRight'), value: 'right', icon: 'format_align_right' },
        ]"
      />
    </template>

    <template v-else-if="block.type === 'image'">
      <AssetField v-model="block.src" :label="t('blockProps.imageLabel')" />
      <q-toggle dense :label="t('blockProps.fullBleedLabel')" v-model="block.fullBleed" />
      <p class="tab-help">{{ t('blockProps.fullBleedHelp') }}</p>
    </template>

    <template v-else-if="block.type === 'avatar'">
      <div class="prop-group-label">{{ t('blockProps.groupContent') }}</div>
      <q-input
        dense
        outlined
        ref="avatarLabelInputRef"
        :label="t('blockProps.labelLabel')"
        v-model="block.label"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.label = insertEmojiAtCaret(avatarLabelInputRef, block.label, v))"
          />
        </template>
      </q-input>

      <div class="prop-group-label">{{ t('blockProps.groupAppearance') }}</div>
      <q-toggle
        v-if="itemScope === 'contacts'"
        dense
        :label="t('blockProps.useItemAvatarLabel')"
        v-model="block.useItemAvatar"
      />
      <AssetField
        v-if="!block.useItemAvatar || itemScope !== 'contacts'"
        v-model="block.src"
        :label="t('blockProps.imageLabel')"
      />
      <q-input
        dense
        outlined
        :label="t('blockProps.iconFallbackLabel')"
        :hint="t('blockProps.iconFallbackHelp')"
        v-model="block.icon"
      >
        <template #append>
          <IconPickerBtn @pick="(v) => (block.icon = v)" />
        </template>
      </q-input>
      <ColorField v-model="block.color" clearable />
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.avatarSizeLabel')"
        suffix="px"
        :model-value="block.size ?? 64"
        @update:model-value="(v) => (block.size = v === null || v === '' ? 64 : Number(v))"
      />
    </template>

    <template v-else-if="block.type === 'row'">
      <div class="prop-group-label">{{ t('blockProps.groupContent') }}</div>
      <q-input
        dense
        outlined
        ref="rowLabelInputRef"
        :label="t('blockProps.labelLabel')"
        v-model="block.label"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.label = insertEmojiAtCaret(rowLabelInputRef, block.label, v))"
          />
        </template>
      </q-input>
      <q-input
        dense
        outlined
        ref="rowSublabelInputRef"
        :label="t('blockProps.sublabelLabel')"
        v-model="block.sublabel"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="
              (v) => (block.sublabel = insertEmojiAtCaret(rowSublabelInputRef, block.sublabel, v))
            "
          />
        </template>
      </q-input>

      <div class="prop-group-label">{{ t('blockProps.groupAppearance') }}</div>
      <q-input dense outlined :label="t('blockProps.iconLabel')" v-model="block.icon">
        <template #append>
          <IconPickerBtn @pick="(v) => (block.icon = v)" />
        </template>
      </q-input>
      <div class="row">
        <ColorField
          v-model="block.iconColor"
          :label="t('blockProps.iconColorLabel')"
          default-value="#ffffff"
          class="grow"
        />
        <ColorField
          v-model="block.textColor"
          :label="t('blockProps.textColorLabel')"
          default-value="#ffffff"
          class="grow"
        />
      </div>
      <q-toggle dense :label="t('blockProps.chevronLabel')" v-model="block.chevron" />
    </template>

    <template v-else-if="block.type === 'card'">
      <p class="tab-help">{{ t('blockProps.cardHelp') }}</p>
      <ColorField
        v-model="block.bgColor"
        :label="t('blockProps.bgColorLabel')"
        default-value="#2a2e37"
        clearable
      />
      <q-expansion-item dense :label="t('blockProps.mapPoiActionTitle')" class="spacing-section">
        <div class="spacing-body condition-body">
          <BlockActionEditor
            :target="block"
            :screens="screens"
            :sheets="sheets"
            :help-text="t('blockProps.cardActionHelp')"
          />
        </div>
      </q-expansion-item>
      <BlockBuilder
        :blocks="ensureChildren()"
        :screens="screens"
        :sheets="sheets"
        :item-scope="itemScope"
        :depth="depth + 1"
      />
    </template>

    <template v-else-if="block.type === 'overlay'">
      <p class="tab-help">{{ t('blockProps.overlayHelp') }}</p>
      <q-select
        dense
        outlined
        :label="t('blockProps.overlayAnchorLabel')"
        v-model="block.anchor"
        :options="[
          { label: t('blockProps.anchorTopLeft'), value: 'top-left' },
          { label: t('blockProps.anchorTopRight'), value: 'top-right' },
          { label: t('blockProps.anchorBottomLeft'), value: 'bottom-left' },
          { label: t('blockProps.anchorBottomRight'), value: 'bottom-right' },
          { label: t('blockProps.anchorCenter'), value: 'center' },
        ]"
        emit-value
        map-options
      />
      <div class="row">
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.overlayOffsetXLabel')"
          suffix="px"
          :model-value="block.offsetX ?? 0"
          @update:model-value="(v) => (block.offsetX = v === null || v === '' ? 0 : Number(v))"
          class="grow"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.overlayOffsetYLabel')"
          suffix="px"
          :model-value="block.offsetY ?? 0"
          @update:model-value="(v) => (block.offsetY = v === null || v === '' ? 0 : Number(v))"
          class="grow"
        />
      </div>
      <BlockBuilder
        :blocks="ensureChildren()"
        :screens="screens"
        :sheets="sheets"
        :item-scope="itemScope"
        :depth="depth + 1"
      />
    </template>

    <template v-else-if="block.type === 'sheet'">
      <p class="tab-help">{{ t('blockProps.sheetHelp') }}</p>
      <q-input
        dense
        outlined
        :label="t('blockProps.sheetIdLabel')"
        :hint="t('blockProps.sheetIdHint')"
        v-model="block.sheetId"
      />
      <q-btn-toggle
        dense
        no-caps
        :model-value="block.position || 'bottom'"
        @update:model-value="(v) => (block.position = v)"
        :options="[
          { label: t('blockProps.sheetPositionBottom'), value: 'bottom' },
          { label: t('blockProps.sheetPositionCenter'), value: 'center' },
          { label: t('blockProps.sheetPositionTop'), value: 'top' },
        ]"
      />
      <q-select
        dense
        outlined
        :label="t('blockProps.sheetSizeLabel')"
        :model-value="block.size || 'auto'"
        @update:model-value="(v) => (block.size = v)"
        :options="[
          { label: t('blockProps.sheetSizeAuto'), value: 'auto' },
          { label: t('blockProps.sheetSizeFullWidth'), value: 'full-width' },
          { label: t('blockProps.sheetSizeFullHeight'), value: 'full-height' },
          { label: t('blockProps.sheetSizeFullScreen'), value: 'full-screen' },
        ]"
        emit-value
        map-options
      />
      <div class="row">
        <ColorField
          v-model="block.bgColor"
          :label="t('blockProps.bgColorLabel')"
          default-value="#1c1f26"
          clearable
          class="grow"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.sheetOpacityLabel')"
          suffix="%"
          min="0"
          max="100"
          :model-value="block.opacity ?? 95"
          @update:model-value="(v) => (block.opacity = v === null || v === '' ? 95 : Number(v))"
          class="grow"
        />
      </div>
      <BlockBuilder
        :blocks="ensureChildren()"
        :screens="screens"
        :sheets="sheets"
        :item-scope="itemScope"
        :depth="depth + 1"
      />
    </template>

    <template v-else-if="block.type === 'layout'">
      <p class="tab-help">{{ t('blockProps.layoutHelp') }}</p>
      <q-btn-toggle
        dense
        no-caps
        v-model="block.direction"
        :options="[
          { label: t('blockProps.directionRow'), value: 'row' },
          { label: t('blockProps.directionColumn'), value: 'column' },
        ]"
      />
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.gapLabel')"
        suffix="px"
        :model-value="block.gap ?? 8"
        @update:model-value="(v) => (block.gap = v === null || v === '' ? 8 : Number(v))"
      />
      <div class="row">
        <q-select
          dense
          outlined
          :label="t('blockProps.layoutJustifyLabel')"
          :model-value="block.justify || ''"
          @update:model-value="(v) => (block.justify = v)"
          :options="[
            { label: t('blockProps.justifyStart'), value: '' },
            { label: t('blockProps.justifyCenter'), value: 'center' },
            { label: t('blockProps.justifyEnd'), value: 'flex-end' },
            { label: t('blockProps.justifyBetween'), value: 'space-between' },
            { label: t('blockProps.justifyAround'), value: 'space-around' },
          ]"
          emit-value
          map-options
          class="grow"
        />
        <q-select
          dense
          outlined
          :label="t('blockProps.layoutAlignLabel')"
          :model-value="block.align || ''"
          @update:model-value="(v) => (block.align = v)"
          :options="[
            { label: t('blockProps.alignStretch'), value: '' },
            { label: t('blockProps.alignItemsStart'), value: 'flex-start' },
            { label: t('blockProps.alignItemsCenter'), value: 'center' },
            { label: t('blockProps.alignItemsEnd'), value: 'flex-end' },
          ]"
          emit-value
          map-options
          class="grow"
        />
      </div>
      <ColorField
        v-model="block.bgColor"
        :label="t('blockProps.bgColorLabel')"
        default-value="#2a2e37"
        clearable
      />
      <BlockBuilder
        :blocks="ensureChildren()"
        :screens="screens"
        :sheets="sheets"
        :item-scope="itemScope"
        :depth="depth + 1"
      />
    </template>

    <template v-else-if="block.type === 'badge'">
      <div class="prop-group-label">{{ t('blockProps.groupContent') }}</div>
      <q-input
        dense
        outlined
        ref="badgeLabelInputRef"
        :label="t('blockProps.labelLabel')"
        v-model="block.label"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.label = insertEmojiAtCaret(badgeLabelInputRef, block.label, v))"
          />
        </template>
      </q-input>

      <div class="prop-group-label">{{ t('blockProps.groupAppearance') }}</div>
      <div class="row">
        <ColorField v-model="block.color" clearable class="grow" />
        <ColorField
          v-model="block.textColor"
          :label="t('blockProps.textColorLabel')"
          default-value="#ffffff"
          class="grow"
        />
      </div>
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.radiusLabel')"
        suffix="px"
        :model-value="block.radius ?? 999"
        @update:model-value="(v) => (block.radius = v === null || v === '' ? 999 : Number(v))"
      />
    </template>

    <template v-else-if="block.type === 'button'">
      <div class="prop-group-label">{{ t('blockProps.groupContent') }}</div>
      <q-input
        dense
        outlined
        ref="buttonLabelInputRef"
        :label="t('blockProps.labelLabel')"
        v-model="block.label"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.label = insertEmojiAtCaret(buttonLabelInputRef, block.label, v))"
          />
        </template>
      </q-input>

      <q-input dense outlined :label="t('blockProps.iconLabel')" v-model="block.icon">
        <template #append>
          <IconPickerBtn @pick="(v) => (block.icon = v)" />
        </template>
      </q-input>

      <div class="prop-group-label">{{ t('blockProps.groupAppearance') }}</div>
      <q-toggle dense :label="t('blockProps.buttonFlatLabel')" v-model="block.flat" />
      <div class="row">
        <ColorField
          v-model="block.color"
          :label="block.flat ? t('blockProps.textColorLabel') : ''"
          clearable
          class="grow"
        />
        <ColorField
          v-if="!block.flat"
          v-model="block.textColor"
          :label="t('blockProps.textColorLabel')"
          default-value="#ffffff"
          class="grow"
        />
      </div>
      <q-btn-toggle
        dense
        no-caps
        :model-value="block.size || 'normal'"
        @update:model-value="(v) => (block.size = v)"
        :options="[
          { label: t('blockProps.sizeSmall'), value: 'small' },
          { label: t('blockProps.sizeNormal'), value: 'normal' },
          { label: t('blockProps.sizeLarge'), value: 'large' },
        ]"
      />
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.radiusLabel')"
        suffix="px"
        :model-value="block.radius ?? 12"
        @update:model-value="(v) => (block.radius = v === null || v === '' ? 12 : Number(v))"
      />

      <BlockActionEditor
        :target="block"
        :screens="screens"
        :sheets="sheets"
        :help-text="t('blockProps.buttonHelp')"
      />
    </template>

    <template v-else-if="block.type === 'tabs'">
      <div v-for="(tab, i) in ensureTabs()" :key="i" class="tab-row">
        <q-input
          dense
          outlined
          :ref="(el) => (tabLabelRefs[i] = el)"
          :label="t('blockProps.tabLabelLabel')"
          v-model="tab.label"
          class="grow"
        >
          <template #append>
            <VariablePickerBtn
              :item-scope="itemScope"
              @pick="(v) => (tab.label = insertEmojiAtCaret(tabLabelRefs[i], tab.label, v))"
            />
          </template>
        </q-input>
        <q-select
          dense
          outlined
          emit-value
          map-options
          :label="t('blockProps.tabScreenLabel')"
          :options="screenOptions"
          v-model="tab.screenId"
          class="grow"
        />
        <q-btn
          dense
          flat
          round
          icon="close"
          size="sm"
          color="negative"
          :disable="block.tabs.length <= 1"
          @click="removeTab(i)"
        />
      </div>
      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('blockProps.addTab')"
        class="btn-ghost"
        @click="addTab"
      />
    </template>

    <template v-else-if="block.type === 'list'">
      <q-btn-toggle
        dense
        no-caps
        :model-value="ensureSource()"
        :options="[
          { label: t('blockProps.listSourceContacts'), value: 'contacts' },
          { label: t('blockProps.listSourceCollection'), value: 'flagCollection' },
          { label: t('blockProps.listSourceEntity'), value: 'entity' },
          { label: t('blockProps.listSourceEntityCollection'), value: 'entityCollection' },
        ]"
        @update:model-value="(v) => (block.source = v)"
      />
      <template v-if="ensureSource() === 'contacts'">
        <q-toggle dense :label="t('blockProps.onlyFollowedLabel')" v-model="block.onlyFollowed" />
        <p class="tab-help">{{ t('blockProps.listHelp') }}</p>
      </template>
      <template v-else-if="ensureSource() === 'flagCollection'">
        <FlagNameField v-model="block.flagKey" />
        <p class="tab-help">{{ t('blockProps.listCollectionHelp') }}</p>
      </template>
      <template v-else-if="ensureSource() === 'entityCollection'">
        <q-select
          dense
          outlined
          :label="t('blockProps.listSchemaLabel')"
          v-model="block.schemaId"
          :options="schemaOptions"
          emit-value
          map-options
        />
        <q-select
          dense
          outlined
          :label="t('blockProps.entityCollectionFieldLabel')"
          :hint="t('blockProps.entityCollectionFieldHint')"
          v-model="block.fieldKey"
          :options="collectionFieldOptions(block.schemaId)"
          emit-value
          map-options
        />
        <q-input
          dense
          outlined
          :label="t('blockProps.scheduleEntityIdLabel')"
          :hint="t('blockProps.scheduleEntityIdHint')"
          :model-value="block.entityId ?? '*'"
          @update:model-value="(v) => (block.entityId = v)"
        />
        <p class="tab-help">{{ t('blockProps.listEntityCollectionHelp') }}</p>
      </template>
      <template v-else>
        <q-select
          dense
          outlined
          :label="t('blockProps.listSchemaLabel')"
          v-model="block.schemaId"
          :options="schemaOptions"
          emit-value
          map-options
        />
        <p class="tab-help">{{ t('blockProps.listEntityHelp') }}</p>
      </template>
      <BlockBuilder
        :blocks="ensureTemplate()"
        :screens="screens"
        :sheets="sheets"
        :item-scope="templateItemScope()"
        :depth="depth + 1"
      />
    </template>

    <template v-else-if="block.type === 'conversations'">
      <p class="tab-help">{{ t('blockProps.conversationsHelp') }}</p>
      <q-toggle dense :label="t('blockProps.showAvatarLabel')" v-model="block.showAvatar" />
      <q-btn-toggle
        dense
        no-caps
        v-model="block.nameField"
        :options="[
          { label: t('blockProps.nameFieldName'), value: 'name' },
          { label: t('blockProps.nameFieldPseudo'), value: 'pseudo' },
        ]"
      />
    </template>

    <template v-else-if="block.type === 'schedule'">
      <p class="tab-help">{{ t('blockProps.scheduleHelp') }}</p>
      <q-select
        dense
        outlined
        :label="t('blockProps.listSchemaLabel')"
        v-model="block.schemaId"
        :options="schemaOptions"
        emit-value
        map-options
      />
      <q-select
        dense
        outlined
        :label="t('blockProps.scheduleFieldLabel')"
        :hint="t('blockProps.scheduleFieldHint')"
        v-model="block.fieldKey"
        :options="scheduleFieldOptions(block.schemaId)"
        emit-value
        map-options
      />
      <q-input
        dense
        outlined
        :label="t('blockProps.scheduleEntityIdLabel')"
        :hint="t('blockProps.scheduleEntityIdHint')"
        v-model="block.entityId"
      />
    </template>

    <template v-else-if="block.type === 'ledger'">
      <p class="tab-help">{{ t('blockProps.ledgerHelp') }}</p>
      <FlagNameField v-model="block.flagKey" />
    </template>

    <template v-else-if="block.type === 'form'">
      <p class="tab-help">{{ t('blockProps.formHelp') }}</p>
      <q-input
        dense
        outlined
        ref="formLabelInputRef"
        :label="t('blockProps.labelLabel')"
        v-model="block.label"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.label = insertEmojiAtCaret(formLabelInputRef, block.label, v))"
          />
        </template>
      </q-input>
      <FormTargetFields :target="block" />
      <q-toggle dense v-model="block.readonly" :label="t('blockProps.formReadonlyLabel')" />
      <template v-if="!block.readonly">
        <p class="tab-help">{{ t('blockProps.formCommitModeHint') }}</p>
        <q-btn-toggle
          dense
          no-caps
          v-model="block.commitMode"
          :options="[
            { label: t('blockProps.formCommitLive'), value: 'live' },
            { label: t('blockProps.formCommitBlur'), value: 'blur' },
            { label: t('blockProps.formCommitButton'), value: 'button' },
          ]"
        />
      </template>
    </template>

    <template v-else-if="block.type === 'lookup'">
      <p class="tab-help">{{ t('blockProps.lookupHelp') }}</p>
      <q-input
        dense
        outlined
        :label="t('blockProps.lookupPlaceholderLabel')"
        v-model="block.placeholder"
      />

      <div v-for="(result, i) in ensureResults()" :key="i" class="lookup-result-row">
        <div class="lookup-result-header">
          <span class="prop-group-label">{{ t('blockProps.lookupResultN', { n: i + 1 }) }}</span>
          <q-btn dense flat round icon="close" size="sm" @click="removeResult(i)">
            <q-tooltip>{{ t('common.delete') }}</q-tooltip>
          </q-btn>
        </div>
        <q-input
          dense
          outlined
          :ref="(el) => (lookupTitleRefs[i] = el)"
          :label="t('blockProps.lookupResultTitleLabel')"
          v-model="result.title"
        >
          <template #append>
            <VariablePickerBtn
              :item-scope="itemScope"
              @pick="
                (v) => (result.title = insertEmojiAtCaret(lookupTitleRefs[i], result.title, v))
              "
            />
          </template>
        </q-input>
        <q-input
          dense
          outlined
          type="textarea"
          autogrow
          :ref="(el) => (lookupExcerptRefs[i] = el)"
          :label="t('blockProps.lookupResultExcerptLabel')"
          v-model="result.excerpt"
        >
          <template #append>
            <VariablePickerBtn
              :item-scope="itemScope"
              @pick="
                (v) =>
                  (result.excerpt = insertEmojiAtCaret(lookupExcerptRefs[i], result.excerpt, v))
              "
            />
          </template>
        </q-input>
        <q-input
          dense
          outlined
          :label="t('blockProps.lookupResultSourceLabel')"
          v-model="result.source"
        />
        <q-expansion-item
          dense
          :label="t('timelineEntryCard.displayCondition')"
          class="spacing-section"
        >
          <div class="spacing-body condition-body">
            <p class="tab-help">{{ t('blockProps.lookupResultRequiresHelp') }}</p>
            <RequiresBuilder
              :model-value="result.requires"
              @update:model-value="(v) => (result.requires = v)"
            />
          </div>
        </q-expansion-item>
        <q-expansion-item
          dense
          :label="t('blockProps.lookupResultActionTitle')"
          class="spacing-section"
        >
          <div class="spacing-body condition-body">
            <BlockActionEditor
              :target="result"
              :screens="screens"
              :sheets="sheets"
              :help-text="t('blockProps.lookupResultActionHelp')"
            />
          </div>
        </q-expansion-item>
      </div>
      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('blockProps.lookupAddResult')"
        class="btn-ghost"
        @click="addResult"
      />
    </template>

    <template v-else-if="block.type === 'map'">
      <p class="tab-help">{{ t('blockProps.mapHelp') }}</p>
      <AssetField v-model="block.src" :label="t('blockProps.mapImageLabel')" />
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.mapHeightLabel')"
        suffix="px"
        :model-value="block.height ?? 280"
        @update:model-value="(v) => (block.height = v === null || v === '' ? 280 : Number(v))"
      />
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.mapInitialZoomLabel')"
        suffix="%"
        min="20"
        max="300"
        :model-value="block.initialZoom ?? 100"
        @update:model-value="(v) => (block.initialZoom = v === null || v === '' ? 100 : Number(v))"
      />

      <div v-for="(poi, i) in ensurePois()" :key="i" class="lookup-result-row">
        <div class="lookup-result-header">
          <span class="prop-group-label">{{ t('blockProps.mapPoiN', { n: i + 1 }) }}</span>
          <q-btn dense flat round icon="close" size="sm" @click="removePoi(i)">
            <q-tooltip>{{ t('common.delete') }}</q-tooltip>
          </q-btn>
        </div>
        <q-input
          dense
          outlined
          :ref="(el) => (mapPoiLabelRefs[i] = el)"
          :label="t('blockProps.mapPoiLabelLabel')"
          v-model="poi.label"
        >
          <template #append>
            <VariablePickerBtn
              :item-scope="itemScope"
              @pick="(v) => (poi.label = insertEmojiAtCaret(mapPoiLabelRefs[i], poi.label, v))"
            />
          </template>
        </q-input>
        <div class="row">
          <q-input
            dense
            outlined
            type="number"
            :label="t('blockProps.mapPoiLabelSizeLabel')"
            suffix="px"
            :model-value="poi.labelSize ?? 12"
            @update:model-value="(v) => (poi.labelSize = v === null || v === '' ? 12 : Number(v))"
            class="grow"
          />
          <ColorField
            v-model="poi.labelColor"
            :label="t('blockProps.mapPoiLabelColorLabel')"
            default-value="#ffffff"
            clearable
          />
        </div>
        <q-toggle
          dense
          :label="t('blockProps.mapPoiDynamicPositionLabel')"
          :model-value="Boolean(poi.link)"
          @update:model-value="(v) => togglePoiLink(poi, v)"
        />
        <p class="tab-help">{{ t('blockProps.mapPoiDynamicPositionHint') }}</p>
        <div v-if="!poi.link" class="row">
          <q-input
            dense
            outlined
            type="number"
            :label="t('blockProps.mapPoiXLabel')"
            suffix="%"
            :model-value="poi.x ?? 50"
            @update:model-value="(v) => (poi.x = v === null || v === '' ? 50 : Number(v))"
            class="grow"
          />
          <q-input
            dense
            outlined
            type="number"
            :label="t('blockProps.mapPoiYLabel')"
            suffix="%"
            :model-value="poi.y ?? 50"
            @update:model-value="(v) => (poi.y = v === null || v === '' ? 50 : Number(v))"
            class="grow"
          />
        </div>
        <q-btn
          v-if="!poi.link"
          dense
          outline
          no-caps
          icon="my_location"
          :color="phone.mapPoiPicker === poi ? 'primary' : undefined"
          :label="
            phone.mapPoiPicker === poi
              ? t('blockProps.mapPoiPickCancel')
              : t('blockProps.mapPoiPickButton')
          "
          class="btn-ghost"
          @click="togglePoiPick(poi)"
        />
        <template v-else>
          <div class="row">
            <q-select
              dense
              outlined
              :label="t('blockProps.listSchemaLabel')"
              v-model="poi.link.schemaId"
              :options="schemaOptions"
              emit-value
              map-options
              class="grow"
            />
            <q-input
              dense
              outlined
              :label="t('blockProps.scheduleEntityIdLabel')"
              :hint="t('blockProps.scheduleEntityIdHint')"
              v-model="poi.link.entityId"
              class="grow"
            />
          </div>
          <div class="row">
            <q-select
              dense
              outlined
              :label="t('blockProps.mapPoiXFieldLabel')"
              v-model="poi.link.xField"
              :options="numberFieldOptions(poi.link.schemaId)"
              emit-value
              map-options
              class="grow"
            />
            <q-select
              dense
              outlined
              :label="t('blockProps.mapPoiYFieldLabel')"
              v-model="poi.link.yField"
              :options="numberFieldOptions(poi.link.schemaId)"
              emit-value
              map-options
              class="grow"
            />
          </div>
        </template>
        <div class="row">
          <q-input
            dense
            outlined
            :label="t('blockProps.iconLabel')"
            v-model="poi.icon"
            class="grow"
          >
            <template #append>
              <IconPickerBtn @pick="(v) => (poi.icon = v)" />
            </template>
          </q-input>
          <ColorField v-model="poi.color" default-value="#4c8bf5" clearable />
        </div>
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.mapPoiSizeLabel')"
          suffix="px"
          :model-value="poi.size ?? 16"
          @update:model-value="(v) => (poi.size = v === null || v === '' ? 16 : Number(v))"
        />
        <AssetField v-model="poi.image" :label="t('blockProps.mapPoiImageLabel')" />
        <q-expansion-item dense :label="t('blockProps.mapPoiActionTitle')" class="spacing-section">
          <div class="spacing-body condition-body">
            <BlockActionEditor
              :target="poi"
              :screens="screens"
              :sheets="sheets"
              :help-text="t('blockProps.mapPoiActionHelp')"
            />
          </div>
        </q-expansion-item>
        <q-expansion-item dense :label="t('blockProps.mapPoiContentTitle')" class="spacing-section">
          <div class="spacing-body condition-body">
            <p class="tab-help">{{ t('blockProps.mapPoiContentHelp') }}</p>
            <BlockBuilder
              :blocks="ensurePoiContent(poi)"
              :screens="screens"
              :sheets="sheets"
              :item-scope="itemScope"
              :depth="depth + 1"
            />
          </div>
        </q-expansion-item>
      </div>
      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('blockProps.mapAddPoi')"
        class="btn-ghost"
        @click="addPoi"
      />
    </template>

    <q-expansion-item
      dense
      :label="t('timelineEntryCard.displayCondition')"
      class="spacing-section"
    >
      <div class="spacing-body condition-body">
        <p class="tab-help">{{ t('timelineEntryCard.displayConditionHelp') }}</p>
        <RequiresBuilder
          :model-value="block.requires"
          @update:model-value="(v) => (block.requires = v)"
        />
      </div>
    </q-expansion-item>

    <q-expansion-item dense :label="t('blockProps.spacingTitle')" class="spacing-section">
      <div class="spacing-body">
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.spacingBeforeLabel')"
          suffix="px"
          :model-value="block.spacingBefore ?? null"
          @update:model-value="
            (v) => (block.spacingBefore = v === null || v === '' ? null : Number(v))
          "
          class="grow"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.spacingAfterLabel')"
          suffix="px"
          :model-value="block.spacingAfter ?? null"
          @update:model-value="
            (v) => (block.spacingAfter = v === null || v === '' ? null : Number(v))
          "
          class="grow"
        />
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup>
import { computed, ref, onUnmounted } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { usePhoneStore } from '@/engine/stores/phone'
import AssetField from '@/editor/components/AssetField.vue'
import ColorField from '@/editor/components/ColorField.vue'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import VariablePickerBtn from '@/editor/components/VariablePickerBtn.vue'
import IconPickerBtn from '@/components/shared/IconPickerBtn.vue'
import FlagNameField from '@/editor/components/FlagNameField.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
// Circular with BlockBuilder.vue (a `card` block recurses into its own
// nested builder) — safe: Vue components only reference each other at
// render time, never during module top-level evaluation.
import BlockBuilder from '@/editor/components/BlockBuilder.vue'
import BlockActionEditor from '@/editor/components/BlockActionEditor.vue'
import FormTargetFields from '@/editor/components/FormTargetFields.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const story = useStoryStore()
const phone = usePhoneStore()

const props = defineProps({
  block: { type: Object, required: true },
  // Every screen of the app being edited (id + display label) — populates
  // the `tabs` block's screen picker. Passed straight through unchanged
  // when this form recurses into a `card` block's own BlockBuilder.
  screens: { type: Array, default: () => [] },
  // Every `sheet` block anywhere in the app (id + display label) — populates
  // a button's `openSheet` action target picker. Same "derived, passed
  // straight through nested BlockBuilders unchanged" treatment as `screens`.
  sheets: { type: Array, default: () => [] },
  // See BlockBuilder.vue's own prop — whether this block is inside a
  // `list` block's per-item template, so its VariablePickerBtn instances
  // also offer the `{item:...}` tokens.
  itemScope: { type: Boolean, default: false },
  // Forwarded straight through to whichever nested BlockBuilder this form
  // renders (card/layout/list-template) — see BlockBuilder.vue's own prop
  // for what it drives (indent guide, empty-state treatment).
  depth: { type: Number, default: 0 },
})

// One ref per text field that can take a {variable} — a bare template ref
// per role (not per block type), safe to reuse across the mutually
// exclusive v-if/v-else-if branches above since only one is ever mounted
// for a given block. `tabLabelRefs` is keyed by index instead, same
// per-row-ref-bag pattern ChoiceEntryForm.vue uses for its own options.
const titleInputRef = ref(null)
const contentInputRef = ref(null)
const avatarLabelInputRef = ref(null)
const rowLabelInputRef = ref(null)
const rowSublabelInputRef = ref(null)
const badgeLabelInputRef = ref(null)
const buttonLabelInputRef = ref(null)
const formLabelInputRef = ref(null)
const tabLabelRefs = {}
const lookupTitleRefs = {}
const lookupExcerptRefs = {}
const mapPoiLabelRefs = {}

function ensureChildren() {
  if (!props.block.blocks) props.block.blocks = []
  return props.block.blocks
}

function ensureTemplate() {
  if (!props.block.template) props.block.template = []
  return props.block.template
}

// `lookup` block (pilier 05) — author-authored search results, each
// individually gated by its own `requires` (RequiresBuilder, same component
// every other condition in this project uses), matched against the
// player's search query at runtime — see LookupBlock.vue.
function ensureResults() {
  if (!props.block.results) props.block.results = []
  return props.block.results
}
function addResult() {
  ensureResults().push({
    title: '',
    excerpt: '',
    source: '',
    requires: null,
    action: { type: 'none' },
  })
}
function removeResult(i) {
  props.block.results.splice(i, 1)
}

// `map` block (fake map) — POIs are positioned in percent of the image's
// own natural size, defaulted to dead center rather than a corner so a
// freshly-added one starts somewhere visible regardless of image
// dimensions.
function ensurePois() {
  if (!props.block.pois) props.block.pois = []
  return props.block.pois
}
function addPoi() {
  ensurePois().push({ x: 50, y: 50, label: '', icon: '', color: '', action: { type: 'none' } })
}
function removePoi(i) {
  if (phone.mapPoiPicker === props.block.pois[i]) phone.mapPoiPicker = null
  props.block.pois.splice(i, 1)
}

// "Click the map instead of typing x/y" (user request) — arms/disarms the
// shared phone.mapPoiPicker (see phone.js) with this exact poi; MapBlock.vue's
// own click handler in the live preview writes x/y into it and disarms.
// Re-clicking the button on the ALREADY-armed poi cancels instead of
// re-arming, so it also serves as the button's own "stop picking" action.
function togglePoiPick(poi) {
  phone.mapPoiPicker = phone.mapPoiPicker === poi ? null : poi
}

// Safety net for the picker above: if the author switches away from THIS
// map block (this form unmounts) while a pick is still armed, don't leave a
// stale poi reference around waiting to catch the next unrelated map click.
// Scoped to only clear a picker this exact instance actually armed — this
// form is recursive (nested instances mount for every expanded row across
// the whole tree), so an unscoped clear here would also fire whenever some
// unrelated block's row happens to unmount elsewhere, silently cancelling
// an in-progress pick on a different map.
onUnmounted(() => {
  if (props.block.pois?.includes(phone.mapPoiPicker)) phone.mapPoiPicker = null
})

// Dynamic position (user request): instead of a fixed x/y, a POI can be
// LINKED to one specific entity instance (schemaId/entityId, same
// typed-by-hand entityId convention as `schedule`'s own field above — no
// dedicated instance picker exists yet) and read its live x/y from two of
// that schema's own number fields — see MapBlock.vue's resolvePosition().
// Toggling off clears the link entirely (not just hides it) so a re-save
// doesn't carry dead schemaId/entityId around once the author picked static
// again.
function togglePoiLink(poi, on) {
  if (on) poi.link = { schemaId: '', entityId: '*', xField: '', yField: '' }
  else poi.link = null
}

function ensurePoiContent(poi) {
  if (!poi.content) poi.content = []
  return poi.content
}

// Only `number`-typed fields make sense as a screen coordinate — same
// filter-by-field-type precedent as scheduleFieldOptions() above, just a
// different target type.
function numberFieldOptions(schemaId) {
  const schema = story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)
  return (schema?.fields || [])
    .filter((f) => f.type === 'number')
    .map((f) => ({ label: f.label || f.key, value: f.key }))
}

// Lazy-inits `source` for a `list` block saved before this field existed —
// same "usage discovers it" fallback other ensure* helpers here use, keeps
// old projects working with zero migration.
function ensureSource() {
  if (!props.block.source) props.block.source = 'contacts'
  return props.block.source
}

// Schema catalog for the `entity` source's picker — authored in the Schémas
// tab (EntitySchemaList.vue), same "read what already exists, don't create
// it here" spirit as FlagNameField reading the flags catalog.
const schemaOptions = computed(
  () =>
    story.project?.gameConfig?.entitySchemas?.map((s) => ({
      label: s.label || s.id,
      value: s.id,
    })) || [],
)

// Field picker for a `schedule` block — only fields actually typed
// `schedule` on the chosen schema make sense here (see EntityFieldInput.vue,
// the only place that authors an array-of-slots value in the first place).
function scheduleFieldOptions(schemaId) {
  const schema = story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)
  return (schema?.fields || [])
    .filter((f) => f.type === 'schedule')
    .map((f) => ({ label: f.label || f.key, value: f.key }))
}

// `list` block's `source: 'entityCollection'` (user request) — only
// `collection`-typed fields make sense here, same filter-by-field-type
// precedent as scheduleFieldOptions above.
function collectionFieldOptions(schemaId) {
  const schema = story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)
  return (schema?.fields || [])
    .filter((f) => f.type === 'collection')
    .map((f) => ({ label: f.label || f.key, value: f.key }))
}

// What to forward as the nested BlockBuilder's `itemScope` — plain source
// name for contacts/flagCollection (their token sets are fixed), but
// `entity:<schemaId>` for the entity source, since ITS token set depends on
// which schema was picked (see VariablePickerBtn.vue's own comment).
function templateItemScope() {
  const source = ensureSource()
  if (source === 'entity') return `entity:${props.block.schemaId || ''}`
  // `entityCollection` items are the SAME `{key, value}` shape a
  // `flagCollection` item already is (just read from a different map) —
  // reuses that token set as-is rather than inventing a parallel one.
  if (source === 'entityCollection') return 'flagCollection'
  return source
}

function ensureTabs() {
  if (!props.block.tabs?.length) props.block.tabs = [{ label: '', screenId: '' }]
  return props.block.tabs
}

function addTab() {
  ensureTabs().push({ label: '', screenId: '' })
}
function removeTab(i) {
  props.block.tabs.splice(i, 1)
}

const screenOptions = computed(() =>
  props.screens.map((s) => ({ label: s.label || s.id, value: s.id })),
)
</script>

<style scoped>
.block-props {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Splits a block type's fields into "what it says" vs "how it looks" (vs
   "what it does", for button) instead of one flat stack of inputs — the
   single most-requested clarity fix after real user testing on this
   builder. First-of-type only where a block genuinely mixes several kinds
   of field; small/single-purpose types (image, card, divider...) skip it,
   a lone header would just be noise there. */
.prop-group-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}
.prop-group-label:first-child {
  margin-top: 0;
}

.tab-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.lookup-result-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.lookup-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row {
  display: flex;
  gap: var(--space-2);
}

.grow {
  flex: 1;
}

.spacing-section {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-top: var(--space-1);
}

.spacing-body {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3);
}

.condition-body {
  flex-direction: column;
}

.tab-help {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
