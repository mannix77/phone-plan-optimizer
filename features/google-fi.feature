Feature: Google Fi plans
  Google Fi is an MVNO on T-Mobile's network with a rare property: full
  QCI 6 priority, the same as T-Mobile's own top postpaid plans.

  Background:
    Given 1 line with no new devices
    And MVNOs are included

  Scenario: Fi Unlimited Premium is priced and prioritized
    When the scenarios are computed
    Then the "Google Fi Unlimited Premium" rows have a 24-month plan cost of 1560.00
    And the "Google Fi Unlimited Premium" rows carry QCI 6

  Scenario: Fi multi-line pricing uses the published two-line rate
    Given 2 lines with no new devices
    When the scenarios are computed
    Then the "Google Fi Unlimited Standard" rows have a 24-month plan cost of 1920.00

  Scenario: Fi Premium qualifies for international use
    Given the user needs "light" data, 0 GB of hotspot, and international use
    When the scenarios are computed
    Then the "Google Fi Unlimited Premium" plan is included
    And the "Google Fi Unlimited Essentials" plan is excluded by needs
