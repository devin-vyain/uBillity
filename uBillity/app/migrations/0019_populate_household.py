from django.db import migrations


def create_household_and_assign(apps, schema_editor):
    Household = apps.get_model('app', 'Household')
    Bill = apps.get_model('app', 'Bill')
    User = apps.get_model('auth', 'User')

    household, _ = Household.objects.get_or_create(name='Household')

    # add your existing user(s) as members — adjust to match your actual username
    your_user = User.objects.get(username='dvyain')
    household.members.add(your_user)

    Bill.objects.all().update(household=household)


def reverse(apps, schema_editor):
    # optional: what to do if this migration is unapplied
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0018_bill_created_by_bill_household'), 
    ]

    operations = [
        migrations.RunPython(create_household_and_assign, reverse),
    ]