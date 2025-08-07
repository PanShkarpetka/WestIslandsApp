<template>
  <v-dialog v-model="dialog" max-width="500">
    <v-card>
      <v-card-title>{{ ship.id ? 'Редагувати корабель' : 'Новий корабель' }}</v-card-title>
      <v-card-text>
        <v-text-field v-model="localShip.name" label="Назва" />
        <v-text-field v-model="localShip.type" label="Тип" />
        <v-text-field v-model.number="localShip.speedUnit" label="Швидкість" type="number" />
        <v-text-field v-model.number="localShip.capacity" label="Місткість" type="number" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="dialog = false">Скасувати</v-btn>
        <v-btn color="primary" @click="save">Зберегти</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { watch, ref } from 'vue';

const props = defineProps({
  ship: Object,
  dialog: Boolean
});
const emit = defineEmits(['update:dialog', 'save']);

const dialog = ref(props.dialog);
const localShip = ref({ ...props.ship });

watch(() => props.dialog, val => dialog.value = val);
watch(() => dialog.value, val => emit('update:dialog', val));
watch(() => props.ship, ship => {
  localShip.value = { ...ship };
});

function save() {
  emit('save', localShip.value);
}
</script>

<style scoped>
</style>
