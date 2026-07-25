from django.contrib import admin
from .models import Household, HouseholdMembership, Bill


class HouseholdMembershipInline(admin.TabularInline):
    model = HouseholdMembership
    extra = 1
    autocomplete_fields = ['user']


@admin.register(Household)
class HouseholdAdmin(admin.ModelAdmin):
    list_display = ['name', 'member_count']
    search_fields = ['name']
    inlines = [HouseholdMembershipInline]

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'


@admin.register(HouseholdMembership)
class HouseholdMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'household', 'is_default', 'joined_at']
    list_filter = ['is_default', 'household']
    autocomplete_fields = ['user', 'household']


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ['name', 'amount', 'type', 'category', 'due_date', 'household', 'created_by', 'reconciled']
    list_filter = ['type', 'category', 'reconciled', 'household']
    search_fields = ['name', 'description']
    autocomplete_fields = ['household', 'created_by']
    date_hierarchy = 'due_date'